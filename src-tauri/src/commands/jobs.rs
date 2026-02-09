use crate::db::DbPool;
use crate::models::{
    CreateJobInput, CreateJobOverheadTaskInput, CreatePersonJobAssignmentInput, Job,
    JobDependencies, JobOverheadTask, JobWithTasks, PersonJobAssignment,
    PersonJobAssignmentWithDetails,
};
use log::{debug, error, info};

// ============================================================================
// Job Commands (CRUD for global job templates)
// ============================================================================

#[tauri::command]
pub async fn list_jobs(pool: tauri::State<'_, DbPool>) -> Result<Vec<Job>, String> {
    debug!("Fetching all jobs");

    let jobs = sqlx::query_as::<_, Job>("SELECT * FROM jobs ORDER BY name")
        .fetch_all(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch jobs: {}", e);
            e.to_string()
        })?;

    info!("Successfully fetched {} jobs", jobs.len());
    Ok(jobs)
}

#[tauri::command]
pub async fn get_job(pool: tauri::State<'_, DbPool>, id: i64) -> Result<JobWithTasks, String> {
    debug!("Fetching job ID: {} with tasks", id);

    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch job: {}", e);
            e.to_string()
        })?;

    let tasks = sqlx::query_as::<_, JobOverheadTask>(
        "SELECT * FROM job_overhead_tasks WHERE job_id = ? ORDER BY name",
    )
    .bind(id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch job tasks: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched job ID: {} with {} tasks",
        id,
        tasks.len()
    );
    Ok(JobWithTasks {
        id: job.id,
        name: job.name,
        description: job.description,
        created_at: job.created_at,
        overhead_tasks: tasks,
    })
}

#[tauri::command]
pub async fn create_job(
    pool: tauri::State<'_, DbPool>,
    input: CreateJobInput,
) -> Result<Job, String> {
    debug!("Creating job: {}", input.name);

    // Check if job with same name already exists
    let existing =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM jobs WHERE LOWER(name) = LOWER(?)")
            .bind(&input.name)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to check existing job: {}", e);
                e.to_string()
            })?;

    if existing > 0 {
        return Err(format!(
            "A job with the name '{}' already exists. Please use a different name.",
            input.name
        ));
    }

    let result = sqlx::query("INSERT INTO jobs (name, description) VALUES (?, ?)")
        .bind(&input.name)
        .bind(&input.description)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to insert job: {}", e);
            e.to_string()
        })?;

    let id = result.last_insert_rowid();
    debug!("Inserted job with ID: {}", id);

    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created job: {}", e);
            e.to_string()
        })?;

    info!("Successfully created job: {}", job.name);
    Ok(job)
}

#[tauri::command]
pub async fn update_job(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateJobInput,
) -> Result<Job, String> {
    debug!("Updating job ID: {}", id);

    // Check if another job with same name already exists (excluding current job)
    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM jobs WHERE LOWER(name) = LOWER(?) AND id != ?",
    )
    .bind(&input.name)
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to check existing job: {}", e);
        e.to_string()
    })?;

    if existing > 0 {
        return Err(format!(
            "A job with the name '{}' already exists. Please use a different name.",
            input.name
        ));
    }

    sqlx::query("UPDATE jobs SET name = ?, description = ? WHERE id = ?")
        .bind(&input.name)
        .bind(&input.description)
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to update job: {}", e);
            e.to_string()
        })?;

    let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch updated job: {}", e);
            e.to_string()
        })?;

    info!("Successfully updated job ID: {}", id);
    Ok(job)
}

#[tauri::command]
pub async fn delete_job(pool: tauri::State<'_, DbPool>, id: i64) -> Result<(), String> {
    debug!("Deleting job ID: {}", id);

    sqlx::query("DELETE FROM jobs WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete job: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted job ID: {}", id);
    Ok(())
}

#[tauri::command]
pub async fn check_job_dependencies(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<JobDependencies, String> {
    debug!("Checking dependencies for job ID: {}", id);

    let task_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM job_overhead_tasks WHERE job_id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to count job tasks: {}", e);
                e.to_string()
            })?;

    let assignment_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM person_job_assignments WHERE job_id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to count job assignments: {}", e);
        e.to_string()
    })?;

    Ok(JobDependencies {
        task_count,
        assignment_count,
    })
}

// ============================================================================
// Job Overhead Task Commands (CRUD for tasks within a job)
// ============================================================================

#[tauri::command]
pub async fn list_job_overhead_tasks(
    pool: tauri::State<'_, DbPool>,
    job_id: i64,
) -> Result<Vec<JobOverheadTask>, String> {
    debug!("Fetching overhead tasks for job ID: {}", job_id);

    let tasks = sqlx::query_as::<_, JobOverheadTask>(
        "SELECT * FROM job_overhead_tasks WHERE job_id = ? ORDER BY name",
    )
    .bind(job_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch job overhead tasks: {}", e);
        e.to_string()
    })?;

    info!("Successfully fetched {} job overhead tasks", tasks.len());
    Ok(tasks)
}

#[tauri::command]
pub async fn create_job_overhead_task(
    pool: tauri::State<'_, DbPool>,
    input: CreateJobOverheadTaskInput,
) -> Result<JobOverheadTask, String> {
    debug!(
        "Creating overhead task '{}' for job ID: {}",
        input.name, input.job_id
    );

    let result = sqlx::query(
        "INSERT INTO job_overhead_tasks (job_id, name, description, effort_hours, effort_period) 
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(input.job_id)
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.effort_hours)
    .bind(&input.effort_period)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert job overhead task: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted job overhead task with ID: {}", id);

    let task =
        sqlx::query_as::<_, JobOverheadTask>("SELECT * FROM job_overhead_tasks WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch created job overhead task: {}", e);
                e.to_string()
            })?;

    info!("Successfully created job overhead task: {}", task.name);
    Ok(task)
}

#[tauri::command]
pub async fn update_job_overhead_task(
    pool: tauri::State<'_, DbPool>,
    id: i64,
    input: CreateJobOverheadTaskInput,
) -> Result<JobOverheadTask, String> {
    debug!("Updating job overhead task ID: {}", id);

    sqlx::query(
        "UPDATE job_overhead_tasks 
         SET name = ?, description = ?, effort_hours = ?, effort_period = ?
         WHERE id = ?",
    )
    .bind(&input.name)
    .bind(&input.description)
    .bind(input.effort_hours)
    .bind(&input.effort_period)
    .bind(id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to update job overhead task: {}", e);
        e.to_string()
    })?;

    let task =
        sqlx::query_as::<_, JobOverheadTask>("SELECT * FROM job_overhead_tasks WHERE id = ?")
            .bind(id)
            .fetch_one(pool.inner())
            .await
            .map_err(|e| {
                error!("Failed to fetch updated job overhead task: {}", e);
                e.to_string()
            })?;

    info!("Successfully updated job overhead task ID: {}", id);
    Ok(task)
}

#[tauri::command]
pub async fn delete_job_overhead_task(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting job overhead task ID: {}", id);

    sqlx::query("DELETE FROM job_overhead_tasks WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete job overhead task: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted job overhead task ID: {}", id);
    Ok(())
}

// ============================================================================
// Person Job Assignment Commands (assign jobs to people for planning periods)
// ============================================================================

#[tauri::command]
pub async fn list_person_job_assignments(
    pool: tauri::State<'_, DbPool>,
    planning_period_id: i64,
) -> Result<Vec<PersonJobAssignmentWithDetails>, String> {
    debug!(
        "Fetching job assignments for planning period ID: {}",
        planning_period_id
    );

    let assignments = sqlx::query_as::<_, PersonJobAssignmentWithDetails>(
        "SELECT 
            pja.id,
            pja.person_id,
            pja.job_id,
            j.name as job_name,
            j.description as job_description,
            pja.planning_period_id,
            pja.created_at
         FROM person_job_assignments pja
         JOIN jobs j ON pja.job_id = j.id
         WHERE pja.planning_period_id = ?
         ORDER BY j.name",
    )
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch person job assignments: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} person job assignments",
        assignments.len()
    );
    Ok(assignments)
}

#[tauri::command]
pub async fn list_person_jobs_for_person(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    planning_period_id: i64,
) -> Result<Vec<PersonJobAssignmentWithDetails>, String> {
    debug!(
        "Fetching job assignments for person ID: {} in period: {}",
        person_id, planning_period_id
    );

    let assignments = sqlx::query_as::<_, PersonJobAssignmentWithDetails>(
        "SELECT 
            pja.id,
            pja.person_id,
            pja.job_id,
            j.name as job_name,
            j.description as job_description,
            pja.planning_period_id,
            pja.created_at
         FROM person_job_assignments pja
         JOIN jobs j ON pja.job_id = j.id
         WHERE pja.person_id = ? AND pja.planning_period_id = ?
         ORDER BY j.name",
    )
    .bind(person_id)
    .bind(planning_period_id)
    .fetch_all(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch jobs for person: {}", e);
        e.to_string()
    })?;

    info!(
        "Successfully fetched {} jobs for person ID: {}",
        assignments.len(),
        person_id
    );
    Ok(assignments)
}

#[tauri::command]
pub async fn create_person_job_assignment(
    pool: tauri::State<'_, DbPool>,
    input: CreatePersonJobAssignmentInput,
) -> Result<PersonJobAssignment, String> {
    debug!(
        "Creating job assignment for person ID: {} to job ID: {} in period: {}",
        input.person_id, input.job_id, input.planning_period_id
    );

    let result = sqlx::query(
        "INSERT INTO person_job_assignments (person_id, job_id, planning_period_id) 
         VALUES (?, ?, ?)",
    )
    .bind(input.person_id)
    .bind(input.job_id)
    .bind(input.planning_period_id)
    .execute(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to insert person job assignment: {}", e);
        e.to_string()
    })?;

    let id = result.last_insert_rowid();
    debug!("Inserted person job assignment with ID: {}", id);

    let assignment = sqlx::query_as::<_, PersonJobAssignment>(
        "SELECT * FROM person_job_assignments WHERE id = ?",
    )
    .bind(id)
    .fetch_one(pool.inner())
    .await
    .map_err(|e| {
        error!("Failed to fetch created person job assignment: {}", e);
        e.to_string()
    })?;

    info!("Successfully created person job assignment");
    Ok(assignment)
}

#[tauri::command]
pub async fn batch_create_person_job_assignments(
    pool: tauri::State<'_, DbPool>,
    person_id: i64,
    job_ids: Vec<i64>,
    planning_period_id: i64,
) -> Result<Vec<PersonJobAssignment>, String> {
    debug!(
        "Batch creating {} job assignments for person ID: {} in period: {}",
        job_ids.len(),
        person_id,
        planning_period_id
    );

    let mut assignments = Vec::new();

    for job_id in job_ids {
        // Check if assignment already exists
        let existing = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM person_job_assignments 
             WHERE person_id = ? AND job_id = ? AND planning_period_id = ?",
        )
        .bind(person_id)
        .bind(job_id)
        .bind(planning_period_id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to check existing assignment: {}", e);
            e.to_string()
        })?;

        if existing > 0 {
            debug!(
                "Assignment already exists for person {} job {} period {}",
                person_id, job_id, planning_period_id
            );
            continue;
        }

        let result = sqlx::query(
            "INSERT INTO person_job_assignments (person_id, job_id, planning_period_id) 
             VALUES (?, ?, ?)",
        )
        .bind(person_id)
        .bind(job_id)
        .bind(planning_period_id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to insert person job assignment: {}", e);
            e.to_string()
        })?;

        let id = result.last_insert_rowid();

        let assignment = sqlx::query_as::<_, PersonJobAssignment>(
            "SELECT * FROM person_job_assignments WHERE id = ?",
        )
        .bind(id)
        .fetch_one(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to fetch created assignment: {}", e);
            e.to_string()
        })?;

        assignments.push(assignment);
    }

    info!(
        "Successfully created {} person job assignments",
        assignments.len()
    );
    Ok(assignments)
}

#[tauri::command]
pub async fn delete_person_job_assignment(
    pool: tauri::State<'_, DbPool>,
    id: i64,
) -> Result<(), String> {
    debug!("Deleting person job assignment ID: {}", id);

    sqlx::query("DELETE FROM person_job_assignments WHERE id = ?")
        .bind(id)
        .execute(pool.inner())
        .await
        .map_err(|e| {
            error!("Failed to delete person job assignment: {}", e);
            e.to_string()
        })?;

    info!("Successfully deleted person job assignment ID: {}", id);
    Ok(())
}
