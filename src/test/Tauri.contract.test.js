import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { PersonService } from '../domains/person/services/personService'
import { ExerciseService } from '../domains/exercise/services/exerciseService'
import { RoutineService } from '../domains/routine/services/routineService'
import { WorkoutService } from '../domains/workout/services/workoutService'

const root = process.cwd()
const frontendFiles = [
  'src/App.jsx',
  'src/components/Updater.tsx',
  'src/domains/person/services/personService.ts',
  'src/domains/exercise/services/exerciseService.ts',
  'src/domains/routine/services/routineService.ts',
  'src/domains/workout/services/workoutService.ts'
]

function registeredCommands() {
  const main = fs.readFileSync(path.join(root, 'src-tauri/src/main.rs'), 'utf8')
  const handler = main.match(/generate_handler!\[([\s\S]*?)\]\)/)?.[1] || ''
  return new Set(handler.match(/\b[a-z][a-z0-9_]+\b/g) || [])
}

function frontendCommands() {
  const commands = new Set()
  for (const file of frontendFiles) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    for (const match of source.matchAll(/["']([a-z][a-z0-9_]+)["']/g)) {
      if (match[1].includes('_') && (source.includes(`invoke('${match[1]}'`) || source.includes(`invoke("${match[1]}"`) || source.includes(`: "${match[1]}"`))) {
        commands.add(match[1])
      }
    }
  }
  return commands
}

describe('contrato frontend con comandos Tauri', () => {
  beforeEach(() => vi.mocked(invoke).mockReset())

  it('registra en el handler todos los comandos invocados por el frontend', () => {
    const registered = registeredCommands()
    const missing = [...frontendCommands()].filter(command => !registered.has(command))
    expect(missing).toEqual([])
  })

  it('serializa correctamente los argumentos críticos de cada dominio', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined)
    const person = { name: 'Ana', last_name: 'Pérez', phone: '123' }
    const exercise = { name: 'Sentadilla', code: 'SQ' }
    await PersonService.createPerson(person)
    await ExerciseService.createExercise(exercise)
    await RoutineService.addExerciseToRoutine(5, 2, 0, 4, 8, 60, 'pesado', 1)
    await WorkoutService.replaceWorkoutSessionGranular([10], [{ person_id: 1, exercise_id: 2, date: '2026-10-04' }])

    expect(invoke).toHaveBeenNthCalledWith(1, 'create_person', { person })
    expect(invoke).toHaveBeenNthCalledWith(2, 'create_exercise', { exercise })
    expect(invoke).toHaveBeenNthCalledWith(3, 'add_exercise_to_routine', {
      routineId: 5,
      exerciseId: 2,
      orderIndex: 0,
      sets: 4,
      reps: 8,
      weight: 60,
      notes: 'pesado',
      groupNumber: 1
    })
    expect(invoke).toHaveBeenNthCalledWith(4, 'replace_workout_session_granular', {
      idsToDelete: [10],
      workoutEntriesToInsert: [{ person_id: 1, exercise_id: 2, date: '2026-10-04' }]
    })
  })
})
