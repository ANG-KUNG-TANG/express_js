import UserModel        from '../../infrastructure/models/user_model.js';
import { findTasks }    from '../../infrastructure/repositories/task_repo.js';
import { UserRole }     from '../../domain/base/user_enums.js';
import logger           from '../../core/logger/logger.js';

/**
 * GET /api/admin/stats
 *
 * Single-pass aggregation for the admin dashboard.
 * User counts use UserModel aggregate directly (user_repo has no count helpers).
 * Task data goes through task_repo — never touches TaskModel directly.
 */
export const getDashboardStatsUC = async () => {
    logger.debug('getDashboardStatsUC: start');

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Single aggregation for all user counts + all tasks + recent in parallel
    const [userAgg, allTasks, recentTasks] = await Promise.all([
        UserModel.aggregate([
            {
                $facet: {
                    total:       [{ $count: 'n' }],
                    admins:      [{ $match: { role: UserRole.ADMIN   } }, { $count: 'n' }],
                    teachers:    [{ $match: { role: UserRole.TEACHER } }, { $count: 'n' }],
                    newThisWeek: [{ $match: { createdAt: { $gte: oneWeekAgo } } }, { $count: 'n' }],
                },
            },
        ]),
        findTasks({}, { limit: 9999 }),
        findTasks({}, { limit: 10, sort: { updatedAt: -1 } }),
    ]);

    const ua   = userAgg[0] ?? {};
    const pick = (facet) => facet?.[0]?.n ?? 0;

    // Derive task counts from repo results — no extra DB round-trips
    const taskCounts = allTasks.reduce((acc, t) => {
        acc[t._status] = (acc[t._status] ?? 0) + 1;
        return acc;
    }, {});

    logger.debug('getDashboardStatsUC: done', { users: pick(ua.total), tasks: allTasks.length });

    return {
        users: {
            total:       pick(ua.total),
            admins:      pick(ua.admins),
            teachers:    pick(ua.teachers),
            newThisWeek: pick(ua.newThisWeek),
        },
        tasks: {
            total:     allTasks.length,
            submitted: taskCounts['SUBMITTED'] ?? 0,
            reviewed:  taskCounts['REVIEWED']  ?? 0,
            scored:    taskCounts['SCORED']    ?? 0,
            draft:     taskCounts['DRAFT']     ?? 0,
        },
        recent: recentTasks.map(t => ({
            id:        t.id,
            title:     t._title,
            status:    t._status,
            bandScore: t._bandScore ?? null,
            updatedAt: t._updatedAt,
            userId:    t._userId   ?? null,
        })),
    };
};