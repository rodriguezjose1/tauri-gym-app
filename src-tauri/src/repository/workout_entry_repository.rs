use crate::models::workout_entry::{WorkoutEntry, WorkoutEntryWithDetails};

pub trait WorkoutEntryRepository {
    fn create(&self, workout_entry: WorkoutEntry) -> Result<(), String>;
    fn create_batch(&self, workout_entries: Vec<WorkoutEntry>) -> Result<(), String>;
    fn replace_session(
        &self,
        person_id: i32,
        date: &str,
        workout_entries: Vec<WorkoutEntry>,
    ) -> Result<(), String>;
    fn replace_session_granular(
        &self,
        ids_to_delete: Vec<i32>,
        workout_entries_to_insert: Vec<WorkoutEntry>,
    ) -> Result<(), String>;
    fn get_by_id(&self, id: i32) -> Result<Option<WorkoutEntry>, String>;
    fn get_by_person_and_date_range(
        &self,
        person_id: i32,
        start_date: &str,
        end_date: &str,
    ) -> Result<Vec<WorkoutEntryWithDetails>, String>;
    fn get_by_person(&self, person_id: i32) -> Result<Vec<WorkoutEntryWithDetails>, String>;
    fn update(&self, workout_entry: WorkoutEntry) -> Result<(), String>;
    fn delete(&self, id: i32) -> Result<(), String>;
    fn delete_by_person_and_date(&self, person_id: i32, date: &str) -> Result<(), String>;
    fn list_all(&self) -> Result<Vec<WorkoutEntryWithDetails>, String>;
    fn update_exercise_order(&self, exercise_orders: Vec<(i32, i32)>) -> Result<(), String>; // (id, order)
    fn renumber_groups(&self, person_id: i32, date: &str) -> Result<(), String>;
}
