use crate::{
    person::Person, person_repository::PersonRepository, person_service::PersonService,
    sqlite_person_repository::SqlitePersonRepository,
};
use rusqlite::Connection;
use std::sync::Arc;
use tempfile::{Builder, TempDir};

struct Fixture {
    directory: TempDir,
    repository: Arc<SqlitePersonRepository>,
    service: PersonService,
}

impl Fixture {
    fn new() -> Self {
        let directory = Builder::new()
            .prefix("gym-person-tests-")
            .tempdir()
            .unwrap();
        let path = directory.path().join("people.sqlite");
        let repository =
            Arc::new(SqlitePersonRepository::new_safe(path.to_str().unwrap()).unwrap());
        let service = PersonService::new(repository.clone());
        Self {
            directory,
            repository,
            service,
        }
    }

    fn connection(&self) -> Connection {
        Connection::open(self.directory.path().join("people.sqlite")).unwrap()
    }

    fn create(&self, name: &str, last_name: &str) -> Person {
        self.service.create_person(person(name, last_name)).unwrap();
        self.service
            .list_people()
            .into_iter()
            .find(|p| p.name == name && p.last_name == last_name)
            .unwrap()
    }

    fn seed(&self) {
        for (name, surname) in [
            ("Zoe", "Perez"),
            ("Ana", "Zapata"),
            ("Luis", "Diaz"),
            ("Ana", "Alonso"),
            ("Eva", "Perez"),
        ] {
            self.create(name, surname);
        }
    }
}

fn person(name: &str, last_name: &str) -> Person {
    Person {
        id: None,
        name: name.into(),
        last_name: last_name.into(),
        phone: "3511234567".into(),
    }
}

fn names(people: &[Person]) -> Vec<String> {
    people
        .iter()
        .map(|p| format!("{} {}", p.name, p.last_name))
        .collect()
}

fn assert_person(actual: &Person, expected: &Person) {
    assert_eq!(actual.id, expected.id);
    assert_eq!(actual.name, expected.name);
    assert_eq!(actual.last_name, expected.last_name);
    assert_eq!(actual.phone, expected.phone);
}

mod contracts {
    use super::*;

    #[test]
    fn creates_and_reads_person_with_generated_id() {
        let f = Fixture::new();
        let saved = f.create("Ana", "Perez");
        assert!(saved.id.unwrap() > 0);
        assert_person(&f.repository.get_by_id(saved.id.unwrap()).unwrap(), &saved);
        assert_eq!(f.repository.count_all(), 1);
        assert_eq!(f.service.count_deleted_people(), 0);
    }

    #[test]
    fn rejects_each_empty_required_field_without_writing() {
        let f = Fixture::new();
        for blank in ["", " \t\n"] {
            for (field, expected) in [
                (0, "Name cannot be empty"),
                (1, "Last name cannot be empty"),
                (2, "Phone cannot be empty"),
            ] {
                let mut value = person("Ana", "Perez");
                match field {
                    0 => value.name = blank.into(),
                    1 => value.last_name = blank.into(),
                    _ => value.phone = blank.into(),
                }
                assert_eq!(f.service.create_person(value).unwrap_err(), expected);
                assert_eq!(f.repository.count_all(), 0);
            }
        }
    }

    #[test]
    fn updates_only_the_target_person() {
        let f = Fixture::new();
        let mut ana = f.create("Ana", "Perez");
        let luis = f.create("Luis", "Diaz");
        ana.name = "Analia".into();
        ana.last_name = "Alonso".into();
        ana.phone = "999".into();
        f.service.update_person(ana.clone()).unwrap();
        assert_person(&f.repository.get_by_id(ana.id.unwrap()).unwrap(), &ana);
        assert_person(&f.repository.get_by_id(luis.id.unwrap()).unwrap(), &luis);
        assert_eq!(f.repository.count_all(), 2);
    }

    #[test]
    fn searches_names_and_surnames_case_insensitively_and_orders_results() {
        let f = Fixture::new();
        f.seed();
        assert_eq!(
            names(&f.service.search_people("ANA")),
            ["Ana Alonso", "Ana Zapata"]
        );
        assert_eq!(
            names(&f.service.search_people("perez")),
            ["Eva Perez", "Zoe Perez"]
        );
        assert!(f.service.search_people("absent").is_empty());
    }

    #[test]
    fn treats_quotes_as_data_not_sql() {
        let f = Fixture::new();
        f.create("Ana", "O'Connor");
        assert_eq!(f.service.search_people("O'Connor").len(), 1);
        assert!(f.service.search_people("' OR 1=1 --").is_empty());
        assert_eq!(f.repository.count_all(), 1);
    }

    #[test]
    fn paginates_without_gaps_and_reports_totals() {
        let f = Fixture::new();
        f.seed();
        let mut all = Vec::new();
        for page in 1..=3 {
            let result = f.service.list_people_paginated_response(page, 2);
            assert_eq!(
                (
                    result.total,
                    result.total_pages,
                    result.page,
                    result.page_size
                ),
                (5, 3, page, 2)
            );
            assert_eq!(result.persons.len(), if page == 3 { 1 } else { 2 });
            all.extend(names(&result.persons));
        }
        assert_eq!(
            all,
            [
                "Ana Alonso",
                "Ana Zapata",
                "Eva Perez",
                "Luis Diaz",
                "Zoe Perez"
            ]
        );
        assert!(f.service.list_people_paginated(4, 2).is_empty());
        assert_eq!(names(&f.service.list_people()), all);
    }

    #[test]
    fn search_pagination_counts_only_matches() {
        let f = Fixture::new();
        f.seed();
        let first = f.service.search_people_paginated_response("ana", 1, 1);
        let second = f.service.search_people_paginated_response("ana", 2, 1);
        assert_eq!((first.total, first.total_pages), (2, 2));
        assert_eq!(names(&first.persons), ["Ana Alonso"]);
        assert_eq!(names(&second.persons), ["Ana Zapata"]);
        assert!(f.service.search_people_paginated("ana", 3, 1).is_empty());
        let empty = f.service.search_people_paginated_response("absent", 1, 2);
        assert_eq!(
            (empty.total, empty.total_pages, empty.persons.len()),
            (0, 0, 0)
        );
    }

    #[test]
    fn soft_delete_excludes_from_active_queries_and_restore_keeps_identity() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        let luis = f.create("Luis", "Diaz");
        f.service.delete_person(ana.id.unwrap()).unwrap();
        assert_eq!(names(&f.service.list_people()), ["Luis Diaz"]);
        assert!(f.service.search_people("Ana").is_empty());
        assert!(f.service.search_people_paginated("Ana", 1, 10).is_empty());
        assert_eq!(
            f.service
                .search_people_paginated_response("Ana", 1, 10)
                .total,
            0
        );
        assert_eq!(f.service.list_people_paginated_response(1, 10).total, 1);
        assert_eq!(f.service.count_deleted_people(), 1);
        assert_person(&f.service.list_deleted_people()[0], &ana);
        let flags: (i32, Option<String>) = f
            .connection()
            .query_row(
                "SELECT is_active, deleted_at FROM people WHERE id = ?",
                [ana.id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(flags.0, 0);
        assert!(flags.1.is_some());
        f.service.restore_person(ana.id.unwrap()).unwrap();
        assert_eq!(f.repository.count_all(), 2);
        assert!(f.service.list_deleted_people().is_empty());
        assert_eq!(f.service.count_deleted_people(), 0);
        assert_person(&f.repository.get_by_id(ana.id.unwrap()).unwrap(), &ana);
        assert_person(&f.repository.get_by_id(luis.id.unwrap()).unwrap(), &luis);
    }

    #[test]
    fn persists_across_repository_and_connection_reopen() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        f.service.delete_person(ana.id.unwrap()).unwrap();
        let path = f.directory.path().join("people.sqlite");
        let Fixture {
            directory,
            service,
            repository,
        } = f;
        drop(service);
        drop(repository);
        let reopened = Arc::new(SqlitePersonRepository::new_safe(path.to_str().unwrap()).unwrap());
        let service = PersonService::new(reopened.clone());
        assert_person(&service.list_deleted_people()[0], &ana);
        service.restore_person(ana.id.unwrap()).unwrap();
        assert_person(&service.list_people()[0], &ana);
        drop(service);
        drop(reopened);
        directory.close().unwrap();
    }

    #[test]
    fn fixtures_are_isolated_and_cleaned_up() {
        let first = Fixture::new();
        let second = Fixture::new();
        first.create("Ana", "Perez");
        assert!(second.service.list_people().is_empty());
        let path = first.directory.path().to_owned();
        drop(first);
        assert!(!path.exists());
        assert!(second.directory.path().exists());
    }

    #[test]
    fn missing_id_read_is_none() {
        assert!(Fixture::new().repository.get_by_id(999).is_none());
    }

    #[test]
    fn invalid_database_path_returns_error() {
        let directory = Builder::new()
            .prefix("gym-person-tests-")
            .tempdir()
            .unwrap();
        let missing_parent = directory.path().join("missing/people.sqlite");
        assert!(SqlitePersonRepository::new_safe(missing_parent.to_str().unwrap()).is_err());
    }

    #[test]
    fn insert_failure_is_propagated_without_changing_existing_people() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        f.connection().execute_batch("CREATE TRIGGER fail_insert BEFORE INSERT ON people BEGIN SELECT RAISE(ABORT, 'test insert blocked'); END;").unwrap();
        let error = f.service.create_person(person("Luis", "Diaz")).unwrap_err();
        assert!(error.contains("test insert blocked"));
        assert_eq!(f.repository.count_all(), 1);
        assert_person(&f.service.list_people()[0], &ana);
    }

    #[test]
    fn update_delete_restore_failures_leave_original_state_intact() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        f.connection().execute_batch("CREATE TRIGGER fail_update BEFORE UPDATE ON people BEGIN SELECT RAISE(ABORT, 'test update blocked'); END;").unwrap();
        let mut edited = ana.clone();
        edited.name = "Changed".into();
        assert!(f
            .service
            .update_person(edited)
            .unwrap_err()
            .contains("test update blocked"));
        assert!(f
            .service
            .delete_person(ana.id.unwrap())
            .unwrap_err()
            .contains("test update blocked"));
        assert_person(&f.service.list_people()[0], &ana);
        f.connection()
            .execute_batch("DROP TRIGGER fail_update;")
            .unwrap();
        f.service.delete_person(ana.id.unwrap()).unwrap();
        f.connection().execute_batch("CREATE TRIGGER fail_update BEFORE UPDATE ON people BEGIN SELECT RAISE(ABORT, 'test update blocked'); END;").unwrap();
        assert!(f
            .service
            .restore_person(ana.id.unwrap())
            .unwrap_err()
            .contains("test update blocked"));
        assert!(f.service.list_people().is_empty());
        assert_person(&f.service.list_deleted_people()[0], &ana);
    }
}

// Characterizations reproduce inconsistencies; green means reproduced, not fixed.
// See docs/testing/incremento-2-backend.md for decisions and proposed corrections.
mod diagnostics {
    use super::*;

    #[test]
    fn per01_update_accepts_empty_required_fields_rejected_by_create() {
        let f = Fixture::new();
        let mut ana = f.create("Ana", "Perez");
        ana.name = " ".into();
        ana.last_name = "".into();
        ana.phone = "".into();
        assert!(f.service.create_person(ana.clone()).is_err());
        assert!(f.service.update_person(ana.clone()).is_ok());
        assert_person(&f.repository.get_by_id(ana.id.unwrap()).unwrap(), &ana);
    }

    #[test]
    fn per02_mutations_report_success_for_missing_ids() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        let mut missing = person("Missing", "Person");
        missing.id = Some(999);
        assert!(f.service.update_person(missing.clone()).is_ok());
        missing.id = None;
        assert!(f.service.update_person(missing).is_ok());
        assert!(f.service.delete_person(999).is_ok());
        assert!(f.service.restore_person(999).is_ok());
        assert_person(&f.service.list_people()[0], &ana);
        assert_eq!(f.repository.count_all(), 1);
    }

    #[test]
    fn per03_read_failures_look_like_an_empty_database() {
        let f = Fixture::new();
        let ana = f.create("Ana", "Perez");
        f.connection()
            .execute_batch("ALTER TABLE people RENAME TO unavailable_people;")
            .unwrap();
        assert!(f.service.list_people().is_empty());
        assert!(f.service.search_people("Ana").is_empty());
        assert!(f.service.list_deleted_people().is_empty());
        assert_eq!(f.service.count_deleted_people(), 0);
        assert_eq!(f.service.list_people_paginated_response(1, 10).total, 0);
        assert_eq!(
            f.service
                .search_people_paginated_response("Ana", 1, 10)
                .total,
            0
        );
        assert!(f.repository.get_by_id(ana.id.unwrap()).is_none());
        f.connection()
            .execute_batch("ALTER TABLE unavailable_people RENAME TO people;")
            .unwrap();
        assert_person(&f.service.list_people()[0], &ana);
    }

    #[test]
    fn per04_negative_page_size_returns_all_rows_with_zero_total_pages() {
        let f = Fixture::new();
        f.seed();
        let result = f.service.list_people_paginated_response(1, -1);
        assert_eq!(
            (result.persons.len(), result.total, result.total_pages),
            (5, 5, 0)
        );
        assert_eq!(
            names(&f.service.list_people_paginated(0, 2)),
            names(&f.service.list_people_paginated(1, 2))
        );
    }

    #[test]
    fn per05_blank_search_differs_between_paginated_and_non_paginated() {
        let f = Fixture::new();
        f.create("Ana", "Perez");
        assert_eq!(f.service.search_people(" ").len(), 1);
        assert!(f.service.search_people_paginated(" ", 1, 10).is_empty());
        assert_eq!(
            f.service.search_people_paginated_response(" ", 1, 10).total,
            0
        );
    }
}
