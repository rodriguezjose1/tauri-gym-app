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

pub fn register_search_normalization(connection: &Connection) -> SqliteResult<()> {
    connection.create_scalar_function(
        "search_normalize",
        1,
        FunctionFlags::SQLITE_UTF8 | FunctionFlags::SQLITE_DETERMINISTIC,
        |context| Ok(normalize_search_text(context.get::<String>(0)?.as_str())),
    )
}

#[cfg(test)]
mod tests {
    use super::{normalize_search_text, register_search_normalization};
    use rusqlite::Connection;

    #[test]
    fn normalizes_case_accents_and_whitespace() {
        assert_eq!(normalize_search_text("  JOSÉ   Muñoz "), "jose munoz");
        assert_eq!(normalize_search_text("Ürsula Peña"), "ursula pena");
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
}
