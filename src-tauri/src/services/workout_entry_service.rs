use std::sync::Arc;
use crate::models::workout_entry::{WorkoutEntry, WorkoutEntryWithDetails};
use crate::repository::workout_entry_repository::WorkoutEntryRepository;

pub struct WorkoutEntryService {
    repository: Arc<dyn WorkoutEntryRepository + Send + Sync>,
}

impl WorkoutEntryService {
    pub fn new(repository: Arc<dyn WorkoutEntryRepository + Send + Sync>) -> Self {
        Self { repository }
    }

    pub fn create_workout_entry(&self, workout_entry: WorkoutEntry) -> Result<(), String> {
        // Validate the workout entry
        if workout_entry.person_id <= 0 {
            return Err("Invalid person ID".to_string());
        }

        if workout_entry.exercise_id <= 0 {
            return Err("Invalid exercise ID".to_string());
        }

        if workout_entry.date.is_empty() {
            return Err("Date is required".to_string());
        }

        // Validate date format (YYYY-MM-DD)
        if !self.is_valid_date_format(&workout_entry.date) {
            return Err("Invalid date format. Use YYYY-MM-DD".to_string());
        }

        // Validate optional numeric fields
        if let Some(sets) = workout_entry.sets {
            if sets <= 0 {
                return Err("Sets must be greater than 0".to_string());
            }
        }

        if let Some(reps) = workout_entry.reps {
            if reps <= 0 {
                return Err("Reps must be greater than 0".to_string());
            }
        }

        if let Some(weight) = workout_entry.weight {
            if weight < 0.0 {
                return Err("Weight cannot be negative".to_string());
            }
        }

        self.repository.create(workout_entry)
    }

    pub fn create_batch(&self, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
        if workout_entries.is_empty() {
            return Err("Workout entries list cannot be empty".to_string());
        }

        // Validate all entries using helper method
        self.validate_workout_entries(&workout_entries)?;

        // Get the first entry to get person_id and date for validation
        let first_entry = &workout_entries[0];
        let person_id = first_entry.person_id;
        let date = &first_entry.date;

        // Validate that new entries can be added to existing session
        self.validate_new_workout_entries_with_existing(&workout_entries, person_id, date)?;

        self.repository.create_batch(workout_entries)
    }

    pub fn create_workout_session(&self, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
        if workout_entries.is_empty() {
            return Err("Workout session cannot be empty".to_string());
        }

        // Validate all entries using helper method
        self.validate_workout_entries(&workout_entries)?;

        // Validate consecutive groups
        self.validate_workout_groups_consecutive(&workout_entries)?;

        // Validate that all entries are for the same person and date
        let first_entry = &workout_entries[0];
        let person_id = first_entry.person_id;
        let date = first_entry.date.clone();
        
        for (index, entry) in workout_entries.iter().enumerate() {
            if entry.person_id != person_id {
                return Err(format!("All exercises must be for the same person. Exercise {} has different person_id", index + 1));
            }
            if entry.date != date {
                return Err(format!("All exercises must be for the same date. Exercise {} has different date", index + 1));
            }
        }

        // Use replace_session to handle both new and existing sessions
        self.repository.replace_session(person_id, &date, workout_entries)
    }

    pub fn replace_workout_session(&self, person_id: i32, date: &str, workout_entries: Vec<WorkoutEntry>) -> Result<(), String> {
        if person_id <= 0 {
            return Err("Invalid person ID".to_string());
        }

        if !self.is_valid_date_format(date) {
            return Err("Invalid date format. Use YYYY-MM-DD".to_string());
        }

        // If workout_entries is empty, just delete existing entries
        if workout_entries.is_empty() {
            return self.repository.replace_session(person_id, date, workout_entries);
        }

        // Validate all entries using helper method
        self.validate_workout_entries(&workout_entries)?;

        // Validate consecutive groups
        self.validate_workout_groups_consecutive(&workout_entries)?;

        // Additional validation for replace session
        for (index, workout_entry) in workout_entries.iter().enumerate() {
            if workout_entry.person_id != person_id {
                return Err(format!("Person ID mismatch in exercise {}", index + 1));
            }

            if workout_entry.date != date {
                return Err(format!("Date mismatch in exercise {}", index + 1));
            }
        }

        self.repository.replace_session(person_id, date, workout_entries)
    }

    pub fn replace_workout_session_granular(&self, ids_to_delete: Vec<i32>, workout_entries_to_insert: Vec<WorkoutEntry>) -> Result<(), String> {
        // Validate IDs to delete
        for id in &ids_to_delete {
            if *id <= 0 {
                return Err("Invalid workout entry ID for deletion".to_string());
            }
        }

        // Validate entries to insert using helper method
        if !workout_entries_to_insert.is_empty() {
            self.validate_workout_entries(&workout_entries_to_insert)?;
        }

        self.repository.replace_session_granular(ids_to_delete, workout_entries_to_insert)
    }

    pub fn get_workout_entry(&self, id: i32) -> Option<WorkoutEntry> {
        if id <= 0 {
            return None;
        }
        self.repository.get_by_id(id)
    }

    pub fn get_workout_entries_by_person_and_date_range(
        &self, 
        person_id: i32, 
        start_date: &str, 
        end_date: &str
    ) -> Vec<WorkoutEntryWithDetails> {
        if person_id <= 0 {
            return Vec::new();
        }

        if !self.is_valid_date_format(start_date) || !self.is_valid_date_format(end_date) {
            return Vec::new();
        }

        self.repository.get_by_person_and_date_range(person_id, start_date, end_date)
    }

    pub fn get_workout_entries_by_person(&self, person_id: i32) -> Vec<WorkoutEntryWithDetails> {
        if person_id <= 0 {
            return Vec::new();
        }
        self.repository.get_by_person(person_id)
    }

    pub fn update_workout_entry(&self, workout_entry: WorkoutEntry) -> Result<(), String> {
        if workout_entry.id.is_none() {
            return Err("Workout entry ID is required for update".to_string());
        }

        // Same validations as create
        if workout_entry.person_id <= 0 {
            return Err("Invalid person ID".to_string());
        }

        if workout_entry.exercise_id <= 0 {
            return Err("Invalid exercise ID".to_string());
        }

        if workout_entry.date.is_empty() {
            return Err("Date is required".to_string());
        }

        if !self.is_valid_date_format(&workout_entry.date) {
            return Err("Invalid date format. Use YYYY-MM-DD".to_string());
        }

        if let Some(sets) = workout_entry.sets {
            if sets <= 0 {
                return Err("Sets must be greater than 0".to_string());
            }
        }

        if let Some(reps) = workout_entry.reps {
            if reps <= 0 {
                return Err("Reps must be greater than 0".to_string());
            }
        }

        if let Some(weight) = workout_entry.weight {
            if weight < 0.0 {
                return Err("Weight cannot be negative".to_string());
            }
        }

        self.repository.update(workout_entry)
    }

    pub fn delete_workout_entry(&self, id: i32) -> Result<(), String> {
        if id <= 0 {
            return Err("Invalid workout entry ID".to_string());
        }

        // Check if the workout entry exists
        if self.repository.get_by_id(id).is_none() {
            return Err("Workout entry not found".to_string());
        }

        self.repository.delete(id)
    }

    pub fn list_all_workout_entries(&self) -> Vec<WorkoutEntryWithDetails> {
        self.repository.list_all()
    }

    pub fn update_exercise_order(&self, exercise_orders: Vec<(i32, i32)>) -> Result<(), String> {
        if exercise_orders.is_empty() {
            return Err("Exercise orders list cannot be empty".to_string());
        }

        // Validate that all IDs are positive and orders are non-negative
        for (id, order) in &exercise_orders {
            if *id <= 0 {
                return Err("Invalid exercise ID".to_string());
            }
            if *order < 0 {
                return Err("Order cannot be negative".to_string());
            }
        }

        self.repository.update_exercise_order(exercise_orders)
    }

    pub fn renumber_groups(&self, person_id: i32, date: &str) -> Result<(), String> {
        if person_id <= 0 {
            return Err("Invalid person ID".to_string());
        }

        if !self.is_valid_date_format(date) {
            return Err("Invalid date format. Use YYYY-MM-DD".to_string());
        }

        self.repository.renumber_groups(person_id, date)
    }

    fn is_valid_date_format(&self, date: &str) -> bool {
        // Simple validation for YYYY-MM-DD format
        if date.len() != 10 {
            return false;
        }

        let parts: Vec<&str> = date.split('-').collect();
        if parts.len() != 3 {
            return false;
        }

        // Check if year, month, day are valid numbers
        if let (Ok(year), Ok(month), Ok(day)) = (
            parts[0].parse::<i32>(),
            parts[1].parse::<i32>(),
            parts[2].parse::<i32>(),
        ) {
            year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31
        } else {
            false
        }
    }

    fn validate_workout_entries(&self, workout_entries: &Vec<WorkoutEntry>) -> Result<(), String> {
        for (index, entry) in workout_entries.iter().enumerate() {
            if entry.person_id <= 0 {
                return Err(format!("Invalid person ID in exercise {}", index + 1));
            }

            if entry.exercise_id <= 0 {
                return Err(format!("Invalid exercise ID in exercise {}", index + 1));
            }

            if entry.date.is_empty() {
                return Err(format!("Date is required in exercise {}", index + 1));
            }

            if !self.is_valid_date_format(&entry.date) {
                return Err(format!("Invalid date format in exercise {}. Use YYYY-MM-DD", index + 1));
            }

            if let Some(sets) = entry.sets {
                if sets <= 0 {
                    return Err(format!("Sets must be greater than 0 in exercise {}", index + 1));
                }
            }

            if let Some(reps) = entry.reps {
                if reps <= 0 {
                    return Err(format!("Reps must be greater than 0 in exercise {}", index + 1));
                }
            }

            if let Some(weight) = entry.weight {
                if weight < 0.0 {
                    return Err(format!("Weight cannot be negative in exercise {}", index + 1));
                }
            }
        }
        Ok(())
    }

    // Validate that workout entry groups are consecutive
    fn validate_workout_groups_consecutive(&self, workout_entries: &Vec<WorkoutEntry>) -> Result<(), String> {
        let groups: std::collections::HashSet<i32> = workout_entries
            .iter()
            .map(|e| e.group_number.unwrap_or(1))
            .collect();
        
        if groups.is_empty() {
            return Ok(());
        }
        
        let min_group = groups.iter().min().unwrap();
        let max_group = groups.iter().max().unwrap();
        
        // First exercise must always be in group 1
        if *min_group != 1 {
            return Err(format!(
                "⚠️ El primer ejercicio debe estar en el grupo 1. No puedes empezar en el grupo {}.",
                min_group
            ));
        }
        
        // Check that all groups from min to max exist
        for group_num in *min_group..=*max_group {
            if !groups.contains(&group_num) {
                return Err(format!(
                    "⚠️ No puedes saltar grupos. Agrega primero un ejercicio al grupo {}.",
                    group_num
                ));
            }
        }
        
        Ok(())
    }

    // Validate that new workout entries can be added to existing session
    fn validate_new_workout_entries_with_existing(&self, new_entries: &Vec<WorkoutEntry>, person_id: i32, date: &str) -> Result<(), String> {
        // Get existing exercises for this person and date
        let existing_entries = self.repository.get_by_person_and_date_range(person_id, date, date);
        
        // If no existing exercises, validate that the first new exercise is in group 1
        if existing_entries.is_empty() {
            let new_groups: std::collections::HashSet<i32> = new_entries
                .iter()
                .map(|e| e.group_number.unwrap_or(1))
                .collect();
            
            if !new_groups.is_empty() {
                let min_new_group = new_groups.iter().min().unwrap();
                if *min_new_group != 1 {
                    return Err(format!(
                        "⚠️ El primer ejercicio debe estar en el grupo 1. No puedes empezar en el grupo {}.",
                        min_new_group
                    ));
                }
            }
        }
        
        // Get all groups (existing + new)
        let mut all_groups: std::collections::HashSet<i32> = existing_entries
            .iter()
            .map(|e| e.group_number.unwrap_or(1))
            .collect();
        
        // Add new groups
        for entry in new_entries {
            all_groups.insert(entry.group_number.unwrap_or(1));
        }
        
        if all_groups.is_empty() {
            return Ok(());
        }
        
        let min_group = all_groups.iter().min().unwrap();
        let max_group = all_groups.iter().max().unwrap();
        
        // Check that all groups from min to max exist
        for group_num in *min_group..=*max_group {
            if !all_groups.contains(&group_num) {
                return Err(format!(
                    "⚠️ No puedes saltar grupos. Agrega primero un ejercicio al grupo {}.",
                    group_num
                ));
            }
        }
        
        Ok(())
    }
} 