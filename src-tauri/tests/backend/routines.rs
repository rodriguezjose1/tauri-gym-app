use crate::{
    exercise::Exercise, exercise_service::ExerciseService, routine_exercise::RoutineExercise,
    routine_repository::RoutineRepository, routine_service::RoutineService,
    sqlite_exercise_repository::SqliteExerciseRepository,
    sqlite_routine_repository::SqliteRoutineRepository,
};
use rusqlite::Connection;
use std::sync::Arc;
use tempfile::{Builder, TempDir};

struct Fixture {
    directory: TempDir,
    path: String,
    repository: Arc<SqliteRoutineRepository>,
    service: RoutineService,
    exercise_service: ExerciseService,
}

impl Fixture {
    fn new() -> Self {
        let directory = Builder::new()
            .prefix("gym-routine-tests-")
            .tempdir()
            .unwrap();
        let path = directory
            .path()
            .join("gym.sqlite")
            .to_str()
            .unwrap()
            .to_owned();
        let exercise_repository = Arc::new(SqliteExerciseRepository::new_safe(&path).unwrap());
        let repository = Arc::new(SqliteRoutineRepository::new_safe(&path).unwrap());
        Self {
            directory,
            path,
            service: RoutineService::new(repository.clone()),
            repository,
            exercise_service: ExerciseService::new(exercise_repository),
        }
    }

    fn connection(&self) -> Connection {
        Connection::open(&self.path).unwrap()
    }

    fn exercise(&self, name: &str, code: &str) -> i32 {
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

    fn routine(&self, name: &str, code: &str) -> i32 {
        self.service
            .create_routine(name.into(), code.into())
            .unwrap()
    }

    fn add(&self, routine_id: i32, exercise_id: i32, order: i32, group: i32) {
        self.service
            .add_exercise_to_routine(
                routine_id,
                exercise_id,
                order,
                Some(3),
                Some(10),
                Some(20.0),
                Some("nota".into()),
                Some(group),
            )
            .unwrap();
    }

    fn routine_exercise(
        &self,
        routine_id: i32,
        exercise_id: i32,
        order: i32,
        group: i32,
    ) -> RoutineExercise {
        RoutineExercise::new(
            routine_id,
            exercise_id,
            order,
            Some(3),
            Some(10),
            Some(20.0),
            None,
            Some(group),
        )
    }
}

mod contracts {
    use super::*;

    #[test]
    fn creates_normalizes_searches_and_updates_routine() {
        let f = Fixture::new();
        let id = f
            .service
            .create_routine("  Fuerza  ".into(), " f1 ".into())
            .unwrap();
        let created = f.service.get_routine_by_id(id).unwrap().unwrap();
        assert_eq!(
            (created.name.as_str(), created.code.as_str()),
            ("Fuerza", "F1")
        );
        assert_eq!(f.service.search_routines("fuer".into()).unwrap().len(), 1);
        f.service
            .update_routine(id, "Hipertrofia".into(), " h1 ".into())
            .unwrap();
        let updated = f.service.get_routine_by_id(id).unwrap().unwrap();
        assert_eq!(
            (updated.name.as_str(), updated.code.as_str()),
            ("Hipertrofia", "H1")
        );
    }

    #[test]
    fn rejects_blank_fields_and_duplicate_codes() {
        let f = Fixture::new();
        assert!(f.service.create_routine(" ".into(), "A".into()).is_err());
        assert!(f.service.create_routine("A".into(), " ".into()).is_err());
        f.routine("Fuerza", "F1");
        assert!(f
            .service
            .create_routine("Otra".into(), "F1".into())
            .is_err());
        assert_eq!(f.service.list_routines().unwrap().len(), 1);
    }

    #[test]
    fn adds_reads_updates_orders_and_removes_exercises() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        let squat = f.exercise("Sentadilla", "SQ");
        let press = f.exercise("Press", "PB");
        f.add(routine, squat, 0, 1);
        f.add(routine, press, 1, 1);
        let initial = f.service.get_routine_exercises(routine).unwrap();
        assert_eq!(
            initial
                .iter()
                .map(|item| item.exercise_code.as_str())
                .collect::<Vec<_>>(),
            ["SQ", "PB"]
        );
        let press_relation = initial[1].id.unwrap();
        f.service
            .update_routine_exercise(
                press_relation,
                routine,
                press,
                1,
                Some(5),
                Some(8),
                Some(30.0),
                Some(" editada ".into()),
                Some(1),
            )
            .unwrap();
        assert_eq!(f.service.get_routine_exercises(routine).unwrap()[1].sets, Some(5));
        f.service
            .reorder_routine_exercises(
                routine,
                vec![(initial[0].id.unwrap(), 2), (press_relation, 0)],
            )
            .unwrap();
        assert_eq!(
            f.service
                .get_routine_exercises(routine).unwrap()
                .iter()
                .map(|item| item.exercise_code.as_str())
                .collect::<Vec<_>>(),
            ["PB", "SQ"]
        );
        f.service
            .remove_exercise_from_routine(routine, squat)
            .unwrap();
        assert_eq!(f.service.get_routine_exercises(routine).unwrap().len(), 1);
    }

    #[test]
    fn rejects_duplicate_exercise_and_nonconsecutive_groups() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        let squat = f.exercise("Sentadilla", "SQ");
        let press = f.exercise("Press", "PB");
        f.add(routine, squat, 0, 1);
        assert!(f
            .service
            .add_exercise_to_routine(routine, squat, 1, None, None, None, None, Some(1))
            .is_err());
        assert!(f
            .service
            .add_exercise_to_routine(routine, press, 1, None, None, None, None, Some(3))
            .is_err());
        assert_eq!(f.service.get_routine_exercises(routine).unwrap().len(), 1);
    }

    #[test]
    fn soft_delete_and_restore_preserve_identity_and_exercises() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        let squat = f.exercise("Sentadilla", "SQ");
        f.add(routine, squat, 0, 1);
        f.service.delete_routine(routine).unwrap();
        assert!(f.service.list_routines().unwrap().is_empty());
        assert_eq!(f.service.list_deleted_routines().unwrap()[0].id, Some(routine));
        assert_eq!(f.service.count_deleted_routines().unwrap(), 1);
        f.service.restore_routine(routine).unwrap();
        assert_eq!(
            f.service
                .get_routine_with_exercises(routine)
                .unwrap().unwrap()
                .exercises
                .len(),
            1
        );
    }

    #[test]
    fn replace_is_atomic_and_preserves_other_routines() {
        let f = Fixture::new();
        let first = f.routine("Fuerza", "F1");
        let second = f.routine("Movilidad", "M1");
        let squat = f.exercise("Sentadilla", "SQ");
        let press = f.exercise("Press", "PB");
        f.add(first, squat, 0, 1);
        f.add(second, squat, 0, 1);
        f.connection().execute_batch("CREATE TRIGGER fail_routine_insert BEFORE INSERT ON routine_exercises WHEN NEW.exercise_id > 0 BEGIN SELECT RAISE(ABORT, 'routine insert blocked'); END;").unwrap();
        let result = f
            .service
            .replace_routine_exercises(first, vec![f.routine_exercise(first, press, 0, 1)]);
        assert!(result.unwrap_err().contains("routine insert blocked"));
        assert_eq!(
            f.service.get_routine_exercises(first).unwrap()[0].exercise_code,
            "SQ"
        );
        assert_eq!(
            f.service.get_routine_exercises(second).unwrap()[0].exercise_code,
            "SQ"
        );
    }

    #[test]
    fn creates_routine_from_workout_with_values_and_order() {
        let f = Fixture::new();
        let squat = f.exercise("Sentadilla", "SQ");
        let press = f.exercise("Press", "PB");
        let routine = f
            .service
            .create_routine_from_workout(
                "Día A".into(),
                "A".into(),
                vec![
                    (
                        squat,
                        Some(4),
                        Some(6),
                        Some(80.0),
                        Some("pesado".into()),
                        Some(1),
                    ),
                    (press, Some(3), Some(10), Some(30.0), None, Some(2)),
                ],
            )
            .unwrap();
        let exercises = f.service.get_routine_exercises(routine).unwrap();
        assert_eq!(
            exercises
                .iter()
                .map(|item| item.order_index)
                .collect::<Vec<_>>(),
            [0, 1]
        );
        assert_eq!(
            (exercises[0].sets, exercises[0].weight),
            (Some(4), Some(80.0))
        );
    }

    #[test]
    fn renumbers_groups_without_affecting_other_routines() {
        let f = Fixture::new();
        let first = f.routine("Fuerza", "F1");
        let second = f.routine("Movilidad", "M1");
        let squat = f.exercise("Sentadilla", "SQ");
        let press = f.exercise("Press", "PB");
        f.repository
            .replace_routine_exercises(
                first,
                vec![
                    f.routine_exercise(first, squat, 0, 2),
                    f.routine_exercise(first, press, 1, 4),
                ],
            )
            .unwrap();
        f.repository
            .replace_routine_exercises(second, vec![f.routine_exercise(second, squat, 0, 5)])
            .unwrap();
        f.service.renumber_routine_groups(first).unwrap();
        assert_eq!(
            f.service
                .get_routine_exercises(first).unwrap()
                .iter()
                .map(|item| item.group_number.unwrap())
                .collect::<Vec<_>>(),
            [1, 2]
        );
        assert_eq!(
            f.service.get_routine_exercises(second).unwrap()[0].group_number,
            Some(5)
        );
    }

    #[test]
    fn fixture_is_isolated_and_removed() {
        let first = Fixture::new();
        let second = Fixture::new();
        first.routine("Fuerza", "F1");
        assert!(second.service.list_routines().unwrap().is_empty());
        let path = first.directory.path().to_owned();
        drop(first);
        assert!(!path.exists());
    }
}

mod consistency {
    use super::*;

    #[test]
    fn rt01_missing_routine_mutations_fail() {
        let f = Fixture::new();
        assert!(f
            .service
            .update_routine(999, "Missing".into(), "MISS".into())
            .is_err());
        assert!(f.service.delete_routine(999).is_err());
        assert!(f.service.restore_routine(999).is_err());
    }

    #[test]
    fn rt02_read_failures_are_propagated() {
        let f = Fixture::new();
        f.routine("Fuerza", "F1");
        f.connection()
            .execute_batch("ALTER TABLE routines RENAME TO unavailable_routines;")
            .unwrap();
        assert!(f.service.list_routines().is_err());
        assert!(f.service.get_routine_by_id(1).is_err());
        assert!(f.service.count_deleted_routines().is_err());
    }

    #[test]
    fn rt03_invalid_numeric_values_are_rejected() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        let squat = f.exercise("Sentadilla", "SQ");
        assert!(f
            .service
            .add_exercise_to_routine(
                routine,
                squat,
                -1,
                Some(0),
                Some(-2),
                Some(-5.0),
                None,
                Some(1)
            )
            .is_err());
        assert!(f.service.get_routine_exercises(routine).unwrap().is_empty());
    }

    #[test]
    fn rt04_missing_relation_mutations_fail() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        let squat = f.exercise("Sentadilla", "SQ");
        assert!(f
            .service
            .update_routine_exercise(999, routine, squat, 0, None, None, None, None, Some(1))
            .is_err());
        assert!(f
            .service
            .remove_exercise_from_routine(routine, squat)
            .is_err());
        assert!(f
            .service
            .reorder_routine_exercises(routine, vec![(999, 1)])
            .is_err());
    }

    #[test]
    fn rt05_replace_rejects_foreign_routine_ids() {
        let f = Fixture::new();
        let first = f.routine("Fuerza", "F1");
        let second = f.routine("Movilidad", "M1");
        let squat = f.exercise("Sentadilla", "SQ");
        assert!(f
            .service
            .replace_routine_exercises(first, vec![f.routine_exercise(second, squat, 0, 1)])
            .is_err());
        assert!(f.service.get_routine_exercises(first).unwrap().is_empty());
        assert!(f.service.get_routine_exercises(second).unwrap().is_empty());
    }

    #[test]
    fn rt06_create_from_workout_is_atomic_when_exercises_fail() {
        let f = Fixture::new();
        let squat = f.exercise("Sentadilla", "SQ");
        f.connection().execute_batch("CREATE TRIGGER fail_routine_insert BEFORE INSERT ON routine_exercises BEGIN SELECT RAISE(ABORT, 'routine insert blocked'); END;").unwrap();
        assert!(f
            .service
            .create_routine_from_workout(
                "Fallida".into(),
                "FAIL".into(),
                vec![(squat, None, None, None, None, Some(1))]
            )
            .is_err());
        assert!(f.service.search_routines("FAIL".into()).unwrap().is_empty());
    }

    #[test]
    fn rt08_deleted_routine_is_not_directly_readable() {
        let f = Fixture::new();
        let routine = f.routine("Fuerza", "F1");
        f.service.delete_routine(routine).unwrap();
        assert!(f.service.get_routine_by_id(routine).unwrap().is_none());
        assert!(f.service.get_routine_with_exercises(routine).unwrap().is_none());
    }
}
