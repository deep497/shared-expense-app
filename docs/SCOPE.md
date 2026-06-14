# Shared Expense App

## Features Implemented

### Authentication
- User registration
- User login
- JWT authentication
- Password hashing using bcrypt

### Group Management
- Create groups
- View groups
- Add members
- Remove members
- Membership history using joined_at and left_at

### Expense Management
- Create expenses
- Edit expenses
- Delete expenses
- Equal split support
- Expense participant tracking

### Balance Calculation
- Paid amount calculation
- Owed amount calculation
- Net balance calculation

### Settlement Engine
- Simplified debt settlement
- Minimum transaction generation

### CSV Import
- CSV upload
- Anomaly detection
- Import reporting

---

## Database Schema

users
groups
group_members
expenses
expense_participants
settlements
import_anomalies

## Anomalies Detected

### INVALID_DATE
Rows containing invalid or non-standard date formats.

Action:
Skipped and logged.

### MISSING_PAYER
Payer does not exist.

Action:
Skipped and logged.

### INVALID_PARTICIPANTS
Participant does not exist.

Action:
Skipped and logged.

### MISSING_CURRENCY
Currency field missing.

Action:
Skipped and logged.

### DUPLICATE_EXPENSE

Action:
Skipped and logged.

### ALIAS_DETECTED

Action:
Flagged for manual review.

### INVALID_GROUP

Action:
Skipped and logged.

### NEGATIVE_AMOUNT

Action:
Flagged as anomaly and logged.

### ZERO_AMOUNT

Action:
Skipped and logged.