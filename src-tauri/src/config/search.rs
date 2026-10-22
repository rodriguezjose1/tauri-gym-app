use rusqlite::{functions::FunctionFlags, Connection, Result as SqliteResult};

/// Produces the canonical representation used by every user-facing search.
/// It is intentionally kept independent from the stored value: names and
/// labels retain their original spelling while comparisons ignore case,
/// surrounding/repeated whitespace and common Latin diacritics.
pub fn normalize_search_text(value: &str) -> String {
    let mut normalized = String::with_capacity(value.len());

    for character in value.trim().chars() {
        let replacement = match character {
            'á' | 'à' | 'ä' | 'â' | 'ã' | 'å' | 'Á' | 'À' | 'Ä' | 'Â' | 'Ã' | 'Å' => {
                'a'
            }
            'é' | 'è' | 'ë' | 'ê' | 'É' | 'È' | 'Ë' | 'Ê' => 'e',
            'í' | 'ì' | 'ï' | 'î' | 'Í' | 'Ì' | 'Ï' | 'Î' => 'i',
            'ó' | 'ò' | 'ö' | 'ô' | 'õ' | 'Ó' | 'Ò' | 'Ö' | 'Ô' | 'Õ' => 'o',
            'ú' | 'ù' | 'ü' | 'û' | 'Ú' | 'Ù' | 'Ü' | 'Û' => 'u',
            'ñ' | 'Ñ' => 'n',
            'ç' | 'Ç' => 'c',
            _ => {
                normalized.extend(character.to_lowercase());
                continue;
            }
        };
        normalized.push(replacement);
    }

    normalized.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn normalize_phone(value: &str) -> String {
    let digits = value
        .chars()
        .filter(char::is_ascii_digit)
        .collect::<String>();
    if digits == "0" {
        String::new()
    } else {
        digits
    }
}

fn edit_distance(left: &str, right: &str) -> usize {
    let right = right.chars().collect::<Vec<_>>();
    let mut previous = (0..=right.len()).collect::<Vec<_>>();
    for (left_index, left_character) in left.chars().enumerate() {
        let mut current = vec![left_index + 1];
        for (right_index, right_character) in right.iter().enumerate() {
            current.push(std::cmp::min(
                std::cmp::min(current[right_index] + 1, previous[right_index + 1] + 1),
                previous[right_index] + usize::from(left_character != *right_character),
            ));
        }
        previous = current;
    }
    previous[right.len()]
}

fn component_is_similar(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }
    let shortest = left.chars().count().min(right.chars().count());
    let longest = left.chars().count().max(right.chars().count());
    if shortest < 4 {
        return false;
    }
    if left.starts_with(right) || right.starts_with(left) {
        return longest - shortest <= 3;
    }
    let allowed_distance = if longest <= 6 { 1 } else { 2 };
    edit_distance(left, right) <= allowed_distance
}

pub fn person_name_is_similar(
    existing_name: &str,
    existing_last_name: &str,
    candidate_name: &str,
    candidate_last_name: &str,
) -> bool {
    let existing_name = normalize_search_text(existing_name);
    let existing_last_name = normalize_search_text(existing_last_name);
    let candidate_name = normalize_search_text(candidate_name);
    let candidate_last_name = normalize_search_text(candidate_last_name);

    let first_names_match = component_is_similar(&existing_name, &candidate_name);
    let last_names_match = component_is_similar(&existing_last_name, &candidate_last_name);
    first_names_match && last_names_match
}

pub fn register_search_normalization(connection: &Connection) -> SqliteResult<()> {
    connection.create_scalar_function(
        "search_normalize",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |context| Ok(normalize_search_text(context.get::<String>(0)?.as_str())),
    )?;
    connection.create_scalar_function(
        "phone_normalize",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |context| Ok(normalize_phone(context.get::<String>(0)?.as_str())),
    )
}

#[cfg(test)]
mod tests {
    use super::{
        normalize_phone, normalize_search_text, person_name_is_similar,
        register_search_normalization,
    };
    use rusqlite::Connection;

    #[test]
    fn normalizes_case_accents_and_whitespace() {
        assert_eq!(normalize_search_text("  JOSÉ   Muñoz "), "jose munoz");
        assert_eq!(normalize_search_text("Ürsula Peña"), "ursula pena");
        assert_eq!(normalize_phone("+54 9 (351) 123-4567"), "5493511234567");
        assert_eq!(normalize_phone("0"), "");
    }

    #[test]
    fn sqlite_search_matches_text_regardless_of_accents() {
        let connection = Connection::open_in_memory().unwrap();
        register_search_normalization(&connection).unwrap();
        connection
            .execute("CREATE TABLE people(name TEXT NOT NULL)", [])
            .unwrap();
        connection
            .execute("INSERT INTO people(name) VALUES ('José Muñoz')", [])
            .unwrap();

        for query in ["jose", "JOSÉ", "munoz", "Muñoz"] {
            let pattern = format!("%{}%", normalize_search_text(query));
            let count: i64 = connection
                .query_row(
                    "SELECT COUNT(*) FROM people WHERE search_normalize(name) LIKE ?1",
                    [pattern],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "query {query:?} should match");
        }
    }

    #[test]
    fn detects_controlled_name_variations_without_matching_short_partial_names() {
        assert!(person_name_is_similar(
            "Candy", "Ferreira", "candi", "Ferreira"
        ));
        assert!(person_name_is_similar(
            "Candy", "Ferreira", "candy", "Ferrei"
        ));
        assert!(person_name_is_similar(
            "José",
            "Rodríguez",
            "Jose",
            "Rodrigues"
        ));
        assert!(!person_name_is_similar("Ana", "Pérez", "Anabel", "Pérez"));
        assert!(!person_name_is_similar(
            "Mario", "Gómez", "Marina", "Giménez"
        ));
    }
}
