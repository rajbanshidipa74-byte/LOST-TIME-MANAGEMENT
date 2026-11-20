# Lost Time Management System — Activity Diagram

This activity diagram represents the main workflow of the Lost Time Management System, including account management, dashboard, activity tracking, daily planner, statistics and lost-time analysis, and profile and goal settings.

```mermaid
flowchart TD
    A((Start)) --> B[Open Lost Time Management System]
    B --> C{Already have an account?}

    C -- No --> D[Register account]
    D --> E[Enter registration details]
    E --> F{Registration details valid?}
    F -- No --> E
    F -- Yes --> G[Create account]
    G --> H[Go to Login]

    C -- Yes --> H[Go to Login]
    H --> I[Enter email/username and password]
    I --> J{Login details correct?}
    J -- No --> K[Display login error]
    K --> I
    J -- Yes --> L[Open Dashboard]

    L --> M[View time summary and dashboard]
    M --> N{Choose an action}

    N -- Track activity --> O[Open Activity Tracking]
    O --> P[Start activity timer]
    P --> Q[Perform activity]
    Q --> R[Stop timer]
    R --> S[Review activity name, category and duration]
    S --> T{Save activity?}
    T -- No --> P
    T -- Yes --> U[Save activity record]
    U --> L

    N -- Daily planner --> V[Open Daily Planner]
    V --> W{Choose planner action}
    W -- Add task --> X[Enter task details and schedule]
    W -- Edit task --> Y[Select and update a task]
    W -- Delete task --> Z[Select and delete a task]
    X --> AA[Save planner changes]
    Y --> AA
    Z --> AA
    AA --> L

    N -- View statistics --> AB[Open Statistics and Lost-Time Analysis]
    AB --> AC[Select date range or filter]
    AC --> AD[Calculate and display time statistics]
    AD --> AE[Review productive time and lost time]
    AE --> L

    N -- Profile and goals --> AF[Open Profile and Goal Settings]
    AF --> AG{Choose setting}
    AG -- Edit profile --> AH[Update profile information]
    AG -- Set goals --> AI[Set or update daily goals]
    AG -- Notifications --> AJ[Update notification preferences]
    AH --> AK[Save settings]
    AI --> AK
    AJ --> AK
    AK --> L

    N -- Logout --> AL[Log out]
    AL --> AM((End))
```

## Main workflow explanation

1. **Start and account access:** The user opens the application, registers if they do not have an account, and logs in.
2. **Dashboard:** After successful login, the system displays the user's time summary and available modules.
3. **Activity tracking:** The user starts and stops a timer, reviews the activity details, and saves the activity record.
4. **Daily planner:** The user can add, edit, or delete tasks and save the changes.
5. **Statistics and lost-time analysis:** The system calculates and displays time statistics for the selected date range.
6. **Profile and goal settings:** The user can update profile information, daily goals, and notification preferences.
7. **Logout:** The user logs out and the workflow ends.

## GitHub upload

Recommended location in your repository:

`docs/diagrams/Activity_Diagram.md`

GitHub supports Mermaid diagrams in Markdown files. Open this file in your repository to view the rendered diagram.
