mod models;
mod repository;
mod services;
mod config;

use tauri::{State, Manager};

use models::person::Person;
use models::exercise::Exercise;
use models::workout_entry::{WorkoutEntry, WorkoutEntryWithDetails};
use services::person_service::PersonService;
use services::exercise_service::ExerciseService;
use services::workout_entry_service::WorkoutEntryService;

use config::db::setup_services;

// Person commands
#[tauri::command]
fn create_person(service: State<'_, PersonService>, person: Person) -> Result<(), String> {
    service.create_person(person)
}

#[tauri::command]
fn get_persons(service: State<'_, PersonService>) -> Vec<Person> {
    service.list_people()
}

#[tauri::command]
fn get_persons_paginated(service: State<'_, PersonService>, page: i32, page_size: i32) -> Vec<Person> {
    service.list_people_paginated(page, page_size)
}

#[tauri::command]
fn search_persons(service: State<'_, PersonService>, query: String) -> Vec<Person> {
    service.search_people(&query)
}

#[tauri::command]
fn search_persons_paginated(service: State<'_, PersonService>, query: String, page: i32, page_size: i32) -> Vec<Person> {
    service.search_people_paginated(&query, page, page_size)
}

#[tauri::command]
fn delete_person(service: State<'_, PersonService>, id: i32) -> Result<(), String> {
    service.delete_person(id)
}

#[tauri::command]
fn update_person(service: State<'_, PersonService>, person: Person) -> Result<(), String> {
    service.update_person(person)
}

// Exercise commands
#[tauri::command]
fn create_exercise(service: State<'_, ExerciseService>, exercise: Exercise) -> Result<(), String> {
    service.create_exercise(exercise)
}

#[tauri::command]
fn get_exercises(service: State<'_, ExerciseService>) -> Vec<Exercise> {
    service.list_exercises()
}

#[tauri::command]
fn get_exercises_paginated(service: State<'_, ExerciseService>, page: i32, page_size: i32) -> Vec<Exercise> {
    service.list_exercises_paginated(page, page_size)
}

#[tauri::command]
fn delete_exercise(service: State<'_, ExerciseService>, id: i32) -> Result<(), String> {
    service.delete_exercise(id)
}

#[tauri::command]
fn update_exercise(service: State<'_, ExerciseService>, exercise: Exercise) -> Result<(), String> {
    service.update_exercise(exercise)
}

#[tauri::command]
fn search_exercises_paginated(service: State<'_, ExerciseService>, query: String, page: i32, page_size: i32) -> Vec<Exercise> {
    service.search_exercises_paginated(&query, page, page_size)
}

// Workout Entry commands
#[tauri::command]
fn create_workout_entry(service: State<'_, WorkoutEntryService>, workout_entry: WorkoutEntry) -> Result<(), String> {
    service.create_workout_entry(workout_entry)
}

#[tauri::command]
fn create_workout_session(service: State<'_, WorkoutEntryService>, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
    service.create_workout_session(workout_entries)
}

#[tauri::command]
fn get_workout_entries_by_person_and_date_range(
    service: State<'_, WorkoutEntryService>, 
    person_id: i32, 
    start_date: String, 
    end_date: String
) -> Vec<WorkoutEntryWithDetails> {
    service.get_workout_entries_by_person_and_date_range(person_id, &start_date, &end_date)
}

#[tauri::command]
fn get_workout_entries_by_person(service: State<'_, WorkoutEntryService>, person_id: i32) -> Vec<WorkoutEntryWithDetails> {
    service.get_workout_entries_by_person(person_id)
}

#[tauri::command]
fn update_workout_entry(service: State<'_, WorkoutEntryService>, workout_entry: WorkoutEntry) -> Result<(), String> {
    service.update_workout_entry(workout_entry)
}

#[tauri::command]
fn delete_workout_entry(service: State<'_, WorkoutEntryService>, id: i32) -> Result<(), String> {
    service.delete_workout_entry(id)
}

#[tauri::command]
fn get_all_workout_entries(service: State<'_, WorkoutEntryService>) -> Vec<WorkoutEntryWithDetails> {
    service.list_all_workout_entries()
}

#[tauri::command]
fn replace_workout_session(service: State<'_, WorkoutEntryService>, person_id: i32, date: String, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
    service.replace_workout_session(person_id, &date, workout_entries)
}

#[tauri::command]
fn replace_workout_session_granular(service: State<'_, WorkoutEntryService>, ids_to_delete: Vec<i32>, workout_entries_to_insert: Vec<WorkoutEntry>) -> Result<(), String> {
    service.replace_workout_session_granular(ids_to_delete, workout_entries_to_insert)
}

#[tauri::command]
fn update_exercise_order(service: State<'_, WorkoutEntryService>, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
    service.update_exercise_order(exercise_orders)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let (person_service, exercise_service, workout_entry_service) = setup_services();
            
            app.manage(person_service);
            app.manage(exercise_service);
            app.manage(workout_entry_service);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Person commands
            create_person, 
            get_persons, 
            get_persons_paginated,
            search_persons,
            search_persons_paginated,
            delete_person, 
            update_person,
            // Exercise commands
            create_exercise,
            get_exercises,
            get_exercises_paginated,
            delete_exercise,
            update_exercise,
            search_exercises_paginated,
            // Workout entry commands
            create_workout_entry,
            create_workout_session,
            get_workout_entries_by_person_and_date_range,
            get_workout_entries_by_person,
            update_workout_entry,
            delete_workout_entry,
            get_all_workout_entries,
            replace_workout_session,
            replace_workout_session_granular,
            update_exercise_order
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}