//! Coordinates installation with native operations, including the startup backup.
use std::sync::Mutex;

#[derive(Default)]
struct Lifecycle { active: usize, installing: bool }
static LIFECYCLE: Mutex<Lifecycle> = Mutex::new(Lifecycle { active: 0, installing: false });

pub struct OperationGuard;
impl OperationGuard {
    pub fn begin() -> Result<Self, String> {
        let mut state = LIFECYCLE.lock().map_err(|e| e.to_string())?;
        if state.installing { return Err("La aplicación se está actualizando".into()); }
        state.active += 1;
        Ok(Self)
    }
}
impl Drop for OperationGuard {
    fn drop(&mut self) {
        if let Ok(mut state) = LIFECYCLE.lock() { state.active -= 1; }
    }
}
pub fn prepare() -> Result<(), String> {
    let mut state = LIFECYCLE.lock().map_err(|e| e.to_string())?;
    if state.active != 0 || state.installing {
        return Err("Hay operaciones en curso. Esperá a que terminen e intentá nuevamente.".into());
    }
    state.installing = true;
    Ok(())
}
pub fn cancel() {
    if let Ok(mut state) = LIFECYCLE.lock() { state.installing = false; }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn installation_waits_for_operations_and_failure_reopens_gate() {
        let operation = OperationGuard::begin().unwrap();
        assert!(prepare().is_err());
        drop(operation);
        prepare().unwrap();
        assert!(OperationGuard::begin().is_err());
        cancel();
        assert!(OperationGuard::begin().is_ok());
    }
}
