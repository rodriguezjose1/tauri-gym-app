#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod models;
mod repository;
mod services;
mod config;

use models::person::Person;
use models::exercise::Exercise;
use models::workout_entry::WorkoutEntry;
use models::routine::Routine;
use models::routine_exercise::RoutineExercise;
use services::person_service::PersonService;
use services::exercise_service::ExerciseService;
use services::workout_entry_service::WorkoutEntryService;
use services::routine_service::RoutineService;
use services::backup_service::BackupService;
use services::updater_service::UpdaterService;
use tauri::{State, Manager};
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
fn get_persons_paginated_response(service: State<'_, PersonService>, page: i32, page_size: i32) -> models::person::PaginatedPersonResponse {
    service.list_people_paginated_response(page, page_size)
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
fn search_persons_paginated_response(service: State<'_, PersonService>, query: String, page: i32, page_size: i32) -> models::person::PaginatedPersonResponse {
    service.search_people_paginated_response(&query, page, page_size)
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
fn get_exercises_paginated(service: State<'_, ExerciseService>, page: i32, page_size: i32) -> models::exercise::PaginatedExerciseResponse {
    service.list_exercises_paginated(page, page_size)
}

#[tauri::command]
fn delete_exercise(service: State<'_, ExerciseService>, id: i32) -> Result<(), String> {
    service.delete_exercise(id)
}

#[tauri::command]
fn restore_exercise(service: State<'_, ExerciseService>, id: i32) -> Result<(), String> {
    service.restore_exercise(id)
}

#[tauri::command]
fn get_deleted_exercises(service: State<'_, ExerciseService>) -> Vec<Exercise> {
    service.list_deleted_exercises()
}

#[tauri::command]
fn count_deleted_exercises(service: State<'_, ExerciseService>) -> i32 {
    service.count_deleted_exercises()
}

#[tauri::command]
fn update_exercise(service: State<'_, ExerciseService>, exercise: Exercise) -> Result<(), String> {
    service.update_exercise(exercise)
}

#[tauri::command]
fn search_exercises_paginated(service: State<'_, ExerciseService>, query: String, page: i32, page_size: i32) -> models::exercise::PaginatedExerciseResponse {
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
fn create_batch(service: State<'_, WorkoutEntryService>, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
    service.create_batch(workout_entries)
}

#[tauri::command]
fn get_workout_entries_by_person_and_date_range(
    service: State<'_, WorkoutEntryService>, 
    person_id: i32, 
    start_date: String, 
    end_date: String
) -> Vec<models::workout_entry::WorkoutEntryWithDetails> {
    service.get_workout_entries_by_person_and_date_range(person_id, &start_date, &end_date)
}

#[tauri::command]
fn get_workout_entries_by_person(service: State<'_, WorkoutEntryService>, person_id: i32) -> Vec<models::workout_entry::WorkoutEntryWithDetails> {
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
fn get_all_workout_entries(service: State<'_, WorkoutEntryService>) -> Vec<models::workout_entry::WorkoutEntryWithDetails> {
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

#[tauri::command]
fn renumber_workout_groups(service: State<'_, WorkoutEntryService>, person_id: i32, date: String) -> Result<(), String> {
    service.renumber_groups(person_id, &date)
}

// Routine commands
#[tauri::command]
fn create_routine(service: State<'_, RoutineService>, name: String, code: String) -> Result<i32, String> {
    service.create_routine(name, code)
}

#[tauri::command]
fn get_routine_by_id(service: State<'_, RoutineService>, id: i32) -> Option<Routine> {
    service.get_routine_by_id(id)
}

#[tauri::command]
fn get_routine_with_exercises(service: State<'_, RoutineService>, id: i32) -> Option<models::routine::RoutineWithExercises> {
    service.get_routine_with_exercises(id)
}

#[tauri::command]
fn update_routine(service: State<'_, RoutineService>, id: i32, name: String, code: String) -> Result<(), String> {
    service.update_routine(id, name, code)
}

#[tauri::command]
fn delete_routine(service: State<'_, RoutineService>, id: i32) -> Result<(), String> {
    service.delete_routine(id)
}

#[tauri::command]
fn list_routines(service: State<'_, RoutineService>) -> Vec<Routine> {
    service.list_routines()
}

#[tauri::command]
fn renumber_routine_groups(service: State<'_, RoutineService>, routine_id: i32) -> Result<(), String> {
    service.renumber_routine_groups(routine_id)
}

#[tauri::command]
fn list_routines_paginated(service: State<'_, RoutineService>, page: i32, page_size: i32) -> Vec<Routine> {
    service.list_routines_paginated(page, page_size)
}

#[tauri::command]
fn search_routines(service: State<'_, RoutineService>, query: String) -> Vec<Routine> {
    service.search_routines(query)
}

#[tauri::command]
fn search_routines_paginated(service: State<'_, RoutineService>, query: String, page: i32, page_size: i32) -> Vec<Routine> {
    service.search_routines_paginated(query, page, page_size)
}

#[tauri::command]
fn add_exercise_to_routine(
    service: State<'_, RoutineService>,
    routine_id: i32,
    exercise_id: i32,
    order_index: i32,
    sets: Option<i32>,
    reps: Option<i32>,
    weight: Option<f64>,
    notes: Option<String>,
    group_number: Option<i32>,
) -> Result<(), String> {
    service.add_exercise_to_routine(routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number)
}

#[tauri::command]
fn update_routine_exercise(
    service: State<'_, RoutineService>,
    id: i32,
    routine_id: i32,
    exercise_id: i32,
    order_index: i32,
    sets: Option<i32>,
    reps: Option<i32>,
    weight: Option<f64>,
    notes: Option<String>,
    group_number: Option<i32>,
) -> Result<(), String> {
    service.update_routine_exercise(id, routine_id, exercise_id, order_index, sets, reps, weight, notes, group_number)
}

#[tauri::command]
fn remove_exercise_from_routine(service: State<'_, RoutineService>, routine_id: i32, exercise_id: i32) -> Result<(), String> {
    service.remove_exercise_from_routine(routine_id, exercise_id)
}

#[tauri::command]
fn get_routine_exercises(service: State<'_, RoutineService>, routine_id: i32) -> Vec<models::routine_exercise::RoutineExerciseWithDetails> {
    service.get_routine_exercises(routine_id)
}

#[tauri::command]
fn reorder_routine_exercises(service: State<'_, RoutineService>, routine_id: i32, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
    service.reorder_routine_exercises(routine_id, exercise_orders)
}

#[tauri::command]
fn replace_routine_exercises(service: State<'_, RoutineService>, routine_id: i32, exercises: Vec<RoutineExercise>) -> Result<(), String> {
    service.replace_routine_exercises(routine_id, exercises)
}

#[tauri::command]
fn create_routine_from_workout(
    service: State<'_, RoutineService>,
    name: String,
    code: String,
    workout_exercises: Vec<(i32, Option<i32>, Option<i32>, Option<f64>, Option<String>, Option<i32>)>,
) -> Result<i32, String> {
    service.create_routine_from_workout(name, code, workout_exercises)
}

// Backup commands
#[tauri::command]
async fn execute_backup(backup_service: tauri::State<'_, BackupService>) -> Result<(), String> {
    backup_service.execute_backup().await
}

// Updater commands
#[tauri::command]
async fn check_for_updates(updater_service: tauri::State<'_, UpdaterService>) -> Result<Option<serde_json::Value>, String> {
    match updater_service.check_for_updates().await {
        Ok(Some(update_info)) => Ok(Some(serde_json::to_value(update_info).map_err(|e| e.to_string())?)),
        Ok(None) => Ok(None),
        Err(e) => Err(e),
    }
}

#[tauri::command]
async fn download_update(updater_service: tauri::State<'_, UpdaterService>, download_url: String) -> Result<(), String> {
    updater_service.download_update(download_url).await
}

fn main() {
    // Load environment variables from .env file
    dotenv::dotenv().ok();
    
    tauri::Builder::default()
        .setup(|app| {
            // Initialize services safely without panic catching
            let (person_service, exercise_service, workout_entry_service, routine_service) = setup_services();
            let backup_service = BackupService::new();
            let updater_service = UpdaterService::new(app.handle().clone());
            
            app.manage(person_service);
            app.manage(exercise_service);
            app.manage(workout_entry_service);
            app.manage(routine_service);
            app.manage(backup_service);
            app.manage(updater_service);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Person commands
            create_person, 
            get_persons, 
            get_persons_paginated,
            get_persons_paginated_response,
            search_persons,
            search_persons_paginated,
            search_persons_paginated_response,
            delete_person, 
            update_person,
            // Exercise commands
            create_exercise,
            get_exercises,
            get_exercises_paginated,
            delete_exercise,
            restore_exercise,
            get_deleted_exercises,
            count_deleted_exercises,
            update_exercise,
            search_exercises_paginated,
            // Workout entry commands
            create_workout_entry,
            create_workout_session,
            create_batch,
            get_workout_entries_by_person_and_date_range,
            get_workout_entries_by_person,
            update_workout_entry,
            delete_workout_entry,
            get_all_workout_entries,
            replace_workout_session,
            replace_workout_session_granular,
            update_exercise_order,
            renumber_workout_groups,
            // Routine commands
            create_routine,
            get_routine_by_id,
            get_routine_with_exercises,
            update_routine,
            delete_routine,
            list_routines,
            renumber_routine_groups,
            list_routines_paginated,
            search_routines,
            search_routines_paginated,
            add_exercise_to_routine,
            update_routine_exercise,
            remove_exercise_from_routine,
            get_routine_exercises,
            reorder_routine_exercises,
            replace_routine_exercises,
            create_routine_from_workout,
            // Backup commands
            execute_backup,
            // Updater commands
            check_for_updates,
            download_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}