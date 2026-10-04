use crate::{
    exercise::{Exercise, PaginatedExerciseResponse},
    exercise_service::ExerciseService,
    person::Person,
    person_service::PersonService,
    sqlite_exercise_repository::SqliteExerciseRepository,
    sqlite_person_repository::SqlitePersonRepository,
    sqlite_workout_entry_repository::SqliteWorkoutEntryRepository,
    workout_entry::{WorkoutEntry, WorkoutEntryWithDetails},
    workout_entry_repository::WorkoutEntryRepository,
    workout_entry_service::WorkoutEntryService,
};
use rusqlite::Connection;
use std::sync::Arc;
use tempfile::{Builder, TempDir};

struct Fixture {
    directory: TempDir,
    path: String,
    workout_repository: Arc<SqliteWorkoutEntryRepository>,
    exercise_service: ExerciseService,
    workout_service: WorkoutEntryService,
}

impl Fixture {
    fn new() -> Self {
        let directory = Builder::new()
            .prefix("gym-exercise-workout-tests-")
            .tempdir()
            .unwrap();
        let path = directory
            .path()
            .join("gym.sqlite")
            .to_str()
            .unwrap()
            .to_owned();
        SqlitePersonRepository::new_safe(&path).unwrap();
        let exercise_repository = Arc::new(SqliteExerciseRepository::new_safe(&path).unwrap());
        let workout_repository = Arc::new(SqliteWorkoutEntryRepository::new_safe(&path).unwrap());
        let exercise_service = ExerciseService::new(exercise_repository.clone());
        let workout_service = WorkoutEntryService::new(workout_repository.clone());
        let fixture = Self {
            directory,
            path,
            workout_repository,
            exercise_service,
            workout_service,
        };
        fixture.create_person("Ana", "Perez");
        fixture.create_person("Luis", "Diaz");
        fixture
    }

    fn connection(&self) -> Connection {
        Connection::open(&self.path).unwrap()
    }

    fn create_person(&self, name: &str, last_name: &str) -> i32 {
        let repository = Arc::new(SqlitePersonRepository::new_safe(&self.path).unwrap());
        PersonService::new(repository)
            .create_person(Person {
                id: None,
                name: name.into(),
                last_name: last_name.into(),
                phone: "3511234567".into(),
            })
            .unwrap();
        self.connection()
            .query_row(
                "SELECT id FROM people WHERE name = ?1 AND last_name = ?2",
                [name, last_name],
                |row| row.get(0),
            )
            .unwrap()
    }

    fn person_id(&self, name: &str) -> i32 {
        self.connection()
            .query_row("SELECT id FROM people WHERE name = ?1", [name], |row| {
                row.get(0)
            })
            .unwrap()
    }

    fn create_exercise(&self, name: &str, code: &str) -> i32 {
        self.exercise_service
            .create_exercise(Exercise {
                id: None,
                name: name.into(),
                code: code.into(),
            })
            .unwrap();
        self.connection()
            .query_row("SELECT id FROM exercise WHERE code = ?1", [code], |row| {
                row.get(0)
            })
            .unwrap()
    }

    fn entry(&self, person_id: i32, exercise_id: i32, date: &str) -> WorkoutEntry {
        WorkoutEntry {
            id: None,
            person_id,
            exercise_id,
            date: date.into(),
            sets: Some(3),
            reps: Some(10),
            weight: Some(20.5),
            notes: Some("control".into()),
            order_index: Some(0),
            group_number: Some(1),
            created_at: None,
            updated_at: None,
        }
    }

    fn entries_for(&self, person_id: i32) -> Vec<WorkoutEntryWithDetails> {
        self.workout_service
            .get_workout_entries_by_person(person_id)
            .unwrap()
    }
}

fn exercise_codes(response: &PaginatedExerciseResponse) -> Vec<&str> {
    response
        .exercises
        .iter()
        .map(|item| item.code.as_str())
        .collect()
}

mod contracts {
    use super::*;

    #[test]
    fn exercise_catalog_creates_searches_paginates_updates_deletes_and_restores() {
        let f = Fixture::new();
        let squat = f.create_exercise("Sentadilla", "SQ");
        f.create_exercise("Press banca", "PB");
        f.create_exercise("Remo", "ROW");

        let first = f.exercise_service.list_exercises_paginated(1, 2).unwrap();
        let second = f.exercise_service.list_exercises_paginated(2, 2).unwrap();
        assert_eq!((first.total, first.total_pages), (3, 2));
        assert_eq!(exercise_codes(&first), ["PB", "ROW"]);
        assert_eq!(exercise_codes(&second), ["SQ"]);
        assert_eq!(
            exercise_codes(
                &f.exercise_service
                    .search_exercises_paginated("press", 1, 10)
                    .unwrap()
            ),
            ["PB"]
        );

        f.exercise_service
            .update_exercise(Exercise {
                id: Some(squat),
                name: "Sentadilla frontal".into(),
                code: "SQF".into(),
            })
            .unwrap();
        assert_eq!(
            exercise_codes(
                &f.exercise_service
                    .search_exercises_paginated("SQF", 1, 10)
                    .unwrap()
            ),
            ["SQF"]
        );
        f.exercise_service.delete_exercise(squat).unwrap();
        assert_eq!(f.exercise_service.count_deleted_exercises().unwrap(), 1);
        assert!(f
            .exercise_service
            .search_exercises_paginated("SQF", 1, 10)
            .unwrap()
            .exercises
            .is_empty());
        f.exercise_service.restore_exercise(squat).unwrap();
        assert_eq!(f.exercise_service.count_deleted_exercises().unwrap(), 0);
        assert_eq!(
            exercise_codes(
                &f.exercise_service
                    .search_exercises_paginated("SQF", 1, 10)
                    .unwrap()
            ),
            ["SQF"]
        );
    }

    #[test]
    fn duplicate_exercise_code_is_rejected_without_changing_catalog() {
        let f = Fixture::new();
        f.create_exercise("Sentadilla", "SQ");
        let error = f
            .exercise_service
            .create_exercise(Exercise {
                id: None,
                name: "Otra".into(),
                code: "SQ".into(),
            })
            .unwrap_err();
        assert!(error.contains("UNIQUE"));
        assert_eq!(f.exercise_service.list_exercises().unwrap().len(), 1);
    }

    #[test]
    fn creates_and_reads_workout_with_joined_details() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        let saved = &f.entries_for(ana)[0];
        assert_eq!(
            (saved.person_name.as_str(), saved.exercise_code.as_str()),
            ("Ana", "SQ")
        );
        assert_eq!(
            (saved.sets, saved.reps, saved.weight),
            (Some(3), Some(10), Some(20.5))
        );
    }

    #[test]
    fn rejects_invalid_workout_fields_without_writing() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let base = f.entry(ana, squat, "2026-09-10");
        let mut invalid = Vec::new();
        let mut value = base.clone();
        value.person_id = 0;
        invalid.push(value);
        let mut value = base.clone();
        value.exercise_id = 0;
        invalid.push(value);
        let mut value = base.clone();
        value.date = "10/09/2026".into();
        invalid.push(value);
        let mut value = base.clone();
        value.sets = Some(0);
        invalid.push(value);
        let mut value = base.clone();
        value.reps = Some(-1);
        invalid.push(value);
        let mut value = base;
        value.weight = Some(-0.1);
        invalid.push(value);
        for entry in invalid {
            assert!(f.workout_service.create_workout_entry(entry).is_err());
        }
        assert!(f.entries_for(ana).is_empty());
    }

    #[test]
    fn session_requires_one_person_one_date_and_consecutive_groups() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let luis = f.person_id("Luis");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let press = f.create_exercise("Press", "PB");
        let mut first = f.entry(ana, squat, "2026-09-10");
        first.group_number = Some(1);
        let mut second = f.entry(ana, press, "2026-09-10");
        second.group_number = Some(2);
        f.workout_service
            .create_workout_session(vec![first.clone(), second.clone()])
            .unwrap();
        assert_eq!(f.entries_for(ana).len(), 2);
        second.person_id = luis;
        assert!(f
            .workout_service
            .create_workout_session(vec![first.clone(), second.clone()])
            .is_err());
        second.person_id = ana;
        second.date = "2026-09-11".into();
        assert!(f
            .workout_service
            .create_workout_session(vec![first.clone(), second.clone()])
            .is_err());
        second.date = "2026-09-10".into();
        second.group_number = Some(3);
        assert!(f
            .workout_service
            .create_workout_session(vec![first, second])
            .is_err());
        assert_eq!(f.entries_for(ana).len(), 2);
    }

    #[test]
    fn reads_are_isolated_by_person_and_date_range() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let luis = f.person_id("Luis");
        let squat = f.create_exercise("Sentadilla", "SQ");
        for (person, date) in [
            (ana, "2026-09-10"),
            (ana, "2026-09-12"),
            (luis, "2026-09-10"),
        ] {
            f.workout_service
                .create_workout_entry(f.entry(person, squat, date))
                .unwrap();
        }
        let range = f
            .workout_service
            .get_workout_entries_by_person_and_date_range(ana, "2026-09-11", "2026-09-12")
            .unwrap();
        assert_eq!(range.len(), 1);
        assert_eq!(range[0].date, "2026-09-12");
        assert_eq!(f.entries_for(ana).len(), 2);
        assert_eq!(f.entries_for(luis).len(), 1);
    }

    #[test]
    fn updates_deletes_and_orders_only_requested_entries() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let press = f.create_exercise("Press", "PB");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        f.workout_service
            .create_workout_entry(f.entry(ana, press, "2026-09-10"))
            .unwrap();
        let mut entries = f.entries_for(ana);
        let first_id = entries[0].id.unwrap();
        let second_id = entries[1].id.unwrap();
        f.workout_service
            .update_exercise_order(vec![(first_id, 2), (second_id, 1)])
            .unwrap();
        entries = f.entries_for(ana);
        assert_eq!(
            entries
                .iter()
                .map(|item| item.id.unwrap())
                .collect::<Vec<_>>(),
            [second_id, first_id]
        );
        let mut updated = f.workout_repository.get_by_id(first_id).unwrap().unwrap();
        updated.sets = Some(5);
        updated.notes = Some("editado".into());
        f.workout_service.update_workout_entry(updated).unwrap();
        assert_eq!(
            f.workout_repository
                .get_by_id(first_id)
                .unwrap()
                .unwrap()
                .sets,
            Some(5)
        );
        f.workout_service.delete_workout_entry(second_id).unwrap();
        assert_eq!(
            f.entries_for(ana)
                .iter()
                .map(|item| item.id.unwrap())
                .collect::<Vec<_>>(),
            [first_id]
        );
    }

    #[test]
    fn replacing_session_preserves_other_people_and_dates() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let luis = f.person_id("Luis");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let press = f.create_exercise("Press", "PB");
        for (person, date) in [
            (ana, "2026-09-10"),
            (ana, "2026-09-11"),
            (luis, "2026-09-10"),
        ] {
            f.workout_service
                .create_workout_entry(f.entry(person, squat, date))
                .unwrap();
        }
        let mut replacement = f.entry(ana, press, "2026-09-10");
        replacement.sets = Some(8);
        f.workout_service
            .replace_workout_session(ana, "2026-09-10", vec![replacement])
            .unwrap();
        let ana_entries = f.entries_for(ana);
        assert_eq!(ana_entries.len(), 2);
        assert!(ana_entries.iter().any(|item| item.date == "2026-09-10"
            && item.exercise_code == "PB"
            && item.sets == Some(8)));
        assert!(ana_entries
            .iter()
            .any(|item| item.date == "2026-09-11" && item.exercise_code == "SQ"));
        assert_eq!(f.entries_for(luis).len(), 1);
    }

    #[test]
    fn replace_and_batch_write_failures_roll_back_every_change() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let press = f.create_exercise("Press", "PB");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        f.connection().execute_batch("CREATE TRIGGER fail_press BEFORE INSERT ON workout_entries WHEN NEW.exercise_id > 0 BEGIN SELECT RAISE(ABORT, 'workout insert blocked'); END;").unwrap();
        assert!(f
            .workout_service
            .replace_workout_session(ana, "2026-09-10", vec![f.entry(ana, press, "2026-09-10")])
            .unwrap_err()
            .contains("workout insert blocked"));
        assert_eq!(f.entries_for(ana).len(), 1);
        assert_eq!(f.entries_for(ana)[0].exercise_code, "SQ");
        assert!(f
            .workout_service
            .create_batch(vec![
                f.entry(ana, squat, "2026-09-11"),
                f.entry(ana, press, "2026-09-11")
            ])
            .is_err());
        assert!(f
            .entries_for(ana)
            .iter()
            .all(|item| item.date != "2026-09-11"));
    }

    #[test]
    fn update_order_and_delete_failures_preserve_workouts() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        let original = f.workout_repository.get_by_id(1).unwrap().unwrap();
        f.connection().execute_batch("CREATE TRIGGER fail_workout_update BEFORE UPDATE ON workout_entries BEGIN SELECT RAISE(ABORT, 'workout update blocked'); END;").unwrap();
        let mut edited = original.clone();
        edited.sets = Some(9);
        assert!(f.workout_service.update_workout_entry(edited).is_err());
        assert!(f
            .workout_service
            .update_exercise_order(vec![(1, 4)])
            .is_err());
        let unchanged = f.workout_repository.get_by_id(1).unwrap().unwrap();
        assert_eq!(
            (unchanged.sets, unchanged.order_index),
            (original.sets, original.order_index)
        );
        f.connection().execute_batch("DROP TRIGGER fail_workout_update; CREATE TRIGGER fail_workout_delete BEFORE DELETE ON workout_entries BEGIN SELECT RAISE(ABORT, 'workout delete blocked'); END;").unwrap();
        assert!(f.workout_service.delete_workout_entry(1).is_err());
        assert!(f.workout_repository.get_by_id(1).unwrap().is_some());
    }

    #[test]
    fn granular_replace_failure_restores_deleted_rows() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        let press = f.create_exercise("Press", "PB");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        f.connection().execute_batch("CREATE TRIGGER fail_granular_insert BEFORE INSERT ON workout_entries BEGIN SELECT RAISE(ABORT, 'granular insert blocked'); END;").unwrap();
        let result = f
            .workout_service
            .replace_workout_session_granular(vec![1], vec![f.entry(ana, press, "2026-09-10")]);
        assert!(result.unwrap_err().contains("granular insert blocked"));
        let remaining = f.entries_for(ana);
        assert_eq!(remaining.len(), 1);
        assert_eq!(
            (remaining[0].id, remaining[0].exercise_code.as_str()),
            (Some(1), "SQ")
        );
    }

    #[test]
    fn renumbers_groups_for_only_the_requested_person_and_date() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let luis = f.person_id("Luis");
        let squat = f.create_exercise("Sentadilla", "SQ");
        for (person, date, group) in [
            (ana, "2026-09-10", 2),
            (ana, "2026-09-10", 4),
            (ana, "2026-09-11", 7),
            (luis, "2026-09-10", 8),
        ] {
            let mut entry = f.entry(person, squat, date);
            entry.group_number = Some(group);
            f.workout_repository.create(entry).unwrap();
        }
        f.workout_service
            .renumber_groups(ana, "2026-09-10")
            .unwrap();
        let mut groups: Vec<i32> = f
            .entries_for(ana)
            .iter()
            .filter(|item| item.date == "2026-09-10")
            .map(|item| item.group_number.unwrap())
            .collect();
        groups.sort();
        assert_eq!(groups, [1, 2]);
        assert!(f
            .entries_for(ana)
            .iter()
            .any(|item| item.date == "2026-09-11" && item.group_number == Some(7)));
        assert_eq!(f.entries_for(luis)[0].group_number, Some(8));
    }

    #[test]
    fn fixture_uses_and_cleans_an_isolated_database() {
        let first = Fixture::new();
        let second = Fixture::new();
        first.create_exercise("Sentadilla", "SQ");
        assert!(second.exercise_service.list_exercises().unwrap().is_empty());
        let path = first.directory.path().to_owned();
        drop(first);
        assert!(!path.exists());
    }

    #[test]
    fn rejects_workouts_for_missing_people_or_exercises() {
        let f = Fixture::new();
        let result = f
            .workout_service
            .create_workout_entry(f.entry(999, 999, "2026-09-10"));
        assert!(result.unwrap_err().contains("FOREIGN KEY"));
        assert!(f.workout_repository.get_by_id(1).unwrap().is_none());
    }
}

mod corrected_contracts {
    use super::*;

    #[test]
    fn ex01_blank_exercise_fields_are_rejected() {
        let f = Fixture::new();
        assert!(f
            .exercise_service
            .create_exercise(Exercise {
                id: None,
                name: " ".into(),
                code: "SQ".into()
            })
            .is_err());
        assert!(f
            .exercise_service
            .create_exercise(Exercise {
                id: None,
                name: "Squat".into(),
                code: " ".into()
            })
            .is_err());
        assert!(f.exercise_service.list_exercises().unwrap().is_empty());
    }

    #[test]
    fn ex02_missing_exercise_mutations_report_errors() {
        let f = Fixture::new();
        assert!(f
            .exercise_service
            .update_exercise(Exercise {
                id: Some(999),
                name: "Missing".into(),
                code: "MISS".into()
            })
            .is_err());
        assert!(f.exercise_service.delete_exercise(999).is_err());
        assert!(f.exercise_service.restore_exercise(999).is_err());
    }

    #[test]
    fn ex03_exercise_read_failures_are_propagated() {
        let f = Fixture::new();
        f.create_exercise("Sentadilla", "SQ");
        f.connection()
            .execute_batch("ALTER TABLE exercise RENAME TO unavailable_exercise;")
            .unwrap();
        assert!(f.exercise_service.list_exercises().is_err());
        assert!(f.exercise_service.list_exercises_paginated(1, 10).is_err());
        assert!(f
            .exercise_service
            .search_exercises_paginated("SQ", 1, 10)
            .is_err());
    }

    #[test]
    fn ex04_invalid_exercise_pagination_is_rejected() {
        let f = Fixture::new();
        f.create_exercise("Sentadilla", "SQ");
        assert!(f.exercise_service.list_exercises_paginated(0, 10).is_err());
        assert!(f.exercise_service.list_exercises_paginated(1, -1).is_err());
        assert!(f.exercise_service.list_exercises_paginated(1, 101).is_err());
    }

    #[test]
    fn wo01_impossible_calendar_date_is_rejected() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        assert!(f
            .workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-02-31"))
            .is_err());
        assert!(f.workout_repository.get_by_id(1).unwrap().is_none());
    }

    #[test]
    fn wo02_batch_rejects_mixed_people_and_dates() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let luis = f.person_id("Luis");
        let squat = f.create_exercise("Sentadilla", "SQ");
        assert!(f
            .workout_service
            .create_batch(vec![
                f.entry(ana, squat, "2026-09-10"),
                f.entry(luis, squat, "2026-09-11")
            ])
            .is_err());
        assert!(f.entries_for(ana).is_empty());
        assert!(f.entries_for(luis).is_empty());
    }

    #[test]
    fn wo04_missing_update_and_order_ids_report_errors() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        let mut missing = f.entry(ana, squat, "2026-09-10");
        missing.id = Some(999);
        assert!(f.workout_service.update_workout_entry(missing).is_err());
        assert!(f
            .workout_service
            .update_exercise_order(vec![(1, 5), (999, 1)])
            .is_err());
        assert_eq!(
            f.workout_repository
                .get_by_id(1)
                .unwrap()
                .unwrap()
                .order_index,
            Some(0)
        );
    }

    #[test]
    fn wo05_workout_read_failures_are_propagated() {
        let f = Fixture::new();
        let ana = f.person_id("Ana");
        let squat = f.create_exercise("Sentadilla", "SQ");
        f.workout_service
            .create_workout_entry(f.entry(ana, squat, "2026-09-10"))
            .unwrap();
        f.connection()
            .execute_batch("ALTER TABLE workout_entries RENAME TO unavailable_workouts;")
            .unwrap();
        assert!(f.workout_service.get_workout_entry(1).is_err());
        assert!(f
            .workout_service
            .get_workout_entries_by_person(ana)
            .is_err());
        assert!(f.workout_service.list_all_workout_entries().is_err());
    }
}
