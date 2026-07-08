from datetime import datetime, timedelta
from typing import List
from ortools.sat.python import cp_model
from app.models.task import Task
from app.models.schedule import ScheduleBlock

def generate_daily_schedule(tasks: List[Task], start_from: datetime = None) -> List[ScheduleBlock]:
    """
    Generates an optimized schedule for the remaining day using Google OR-Tools CP-SAT solver.
    """
    if not tasks:
        return []

    # 1. Define scheduling window
    now = datetime.now()
    if start_from:
        day_start = start_from
    else:
        # Start now or 9 AM today, whichever is later
        nine_am_today = now.replace(hour=9, minute=0, second=0, microsecond=0)
        day_start = max(now, nine_am_today)
    
    # End of workday: 9 PM today
    day_end = day_start.replace(hour=21, minute=0, second=0, microsecond=0)
    
    # If the remaining workday is less than 30 minutes, plan for tomorrow!
    if (day_end - day_start).total_seconds() / 60 < 30:
        day_start = (day_start + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        day_end = day_start.replace(hour=21, minute=0, second=0, microsecond=0)

    # Convert times to relative minutes from day_start
    total_available_minutes = int((day_end - day_start).total_seconds() / 60)
    if total_available_minutes <= 0:
        return []

    # 2. Setup CP-SAT model
    model = cp_model.CpModel()
    
    # Store variables for each task
    task_intervals = []
    task_starts = {}
    task_ends = {}
    task_actives = {}
    
    for task in tasks:
        duration = task.estimated_duration or 45
        
        # Maximize scheduling high priority tasks
        # If task doesn't fit, it can be un-scheduled (optional interval)
        is_active = model.NewBoolVar(f'active_{task.id}')
        
        # Define start/end bounds relative to day_start (0 to total_available_minutes)
        # Note: If task deadline is today, cap the end time at the relative deadline minutes
        max_end_minute = total_available_minutes
        if task.deadline:
            relative_deadline = int((task.deadline - day_start).total_seconds() / 60)
            if 0 < relative_deadline < total_available_minutes:
                max_end_minute = relative_deadline
                
        # Start and End variable definitions
        start_var = model.NewIntVar(0, total_available_minutes, f'start_{task.id}')
        end_var = model.NewIntVar(0, total_available_minutes, f'end_{task.id}')
        
        # Define optional interval
        interval_var = model.NewOptionalIntervalVar(
            start_var, duration, end_var, is_active, f'interval_{task.id}'
        )
        
        task_intervals.append(interval_var)
        task_starts[task.id] = start_var
        task_ends[task.id] = end_var
        task_actives[task.id] = is_active

    # 3. Add Constraints
    # Constraint A: Tasks cannot overlap
    model.AddNoOverlap(task_intervals)
    
    # Constraint B (Optional project flavor): Insert mandatory break blocks
    # For a final year project, we add this as an optimization constraint:
    # We want to maximize the sum of active tasks weighted by their priorities
    # and minimize the start time of high priority tasks (schedule them early).
    
    # 4. Objective function
    # Objective: Maximize sum(active_i * priority_i) - small penalty for starting later
    objective_terms = []
    for task in tasks:
        # Scale priority to make it the primary factor (e.g. priority * 1000)
        objective_terms.append(task_actives[task.id] * (task.priority * 1000))
        # Penalty for scheduling tasks later in the day
        objective_terms.append(-task_ends[task.id])
        
    model.Maximize(sum(objective_terms))

    # 5. Solve model
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 5.0
    status = solver.Solve(model)

    blocks = []
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        # Parse solver outputs back into ScheduleBlocks
        current_time = day_start
        
        # We want to sort tasks by their solved start times
        solved_tasks = []
        for task in tasks:
            if solver.BooleanValue(task_actives[task.id]):
                start_min = solver.Value(task_starts[task.id])
                end_min = solver.Value(task_ends[task.id])
                solved_tasks.append((start_min, end_min, task))
                
        # Sort by start minutes
        solved_tasks.sort(key=lambda x: x[0])
        
        # Construct schedule blocks (adding break blocks in between if needed)
        last_end_min = 0
        for start_min, end_min, task in solved_tasks:
            # Check if there is a gap for a break before this task
            if start_min > last_end_min:
                break_start = day_start + timedelta(minutes=last_end_min)
                break_end = day_start + timedelta(minutes=start_min)
                blocks.append(ScheduleBlock(
                    task_id=None,
                    start_time=break_start,
                    end_time=break_end,
                    label="Break / Rest Buffer",
                    is_completed=False
                ))
                
            block_start = day_start + timedelta(minutes=start_min)
            block_end = day_start + timedelta(minutes=end_min)
            blocks.append(ScheduleBlock(
                task_id=task.id,
                start_time=block_start,
                end_time=block_end,
                label=task.title,
                is_completed=False
            ))
            last_end_min = end_min
            
    return blocks
