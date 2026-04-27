// src/app/admin/adm_teacher_workloads.uc.js
import { getTeacherWorkloads } from '../../infrastructure/repositories/user_repo.js';

/**
 * adminTeacherWorkloadsUC()
 *
 * Returns all teachers with their assigned student count,
 * sorted descending by student count (busiest teacher first).
 *
 * Shape: [{ id, name, email, studentCount }]
 *
 * Use cases:
 *  - Admin dashboard workload panel.
 *  - Deciding which teacher to assign a new student to (pick lowest count).
 *  - Detecting overloaded teachers needing support.
 *
 * No input params — always returns the full teacher list.
 * If you need pagination later, add skip/limit to the repo aggregation.
 */
export const adminTeacherWorkloadsUC = async () => {
    return await getTeacherWorkloads();
};