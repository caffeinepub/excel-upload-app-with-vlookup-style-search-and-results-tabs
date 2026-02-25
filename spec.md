# Specification

## Summary
**Goal:** Add a "Repeat Daily Until" option for reminders, a startup popup showing today's reminders, and a customer import feature supporting PDF and Excel files.

**Planned changes:**
- Add an optional "Repeat Daily Until" date picker to the reminder creation/edit form; reminders with this field trigger daily from start date through the specified end date
- Update the backend Reminder data model to store an optional `repeatUntilDate` field and add a `getRemindersForDate` query that resolves daily-repeat reminders correctly
- On app startup, show a dismissible modal listing all reminders due today (including daily-repeat occurrences); the popup only appears once per session and is skipped if no reminders are due today
- Add an "Import" button in the Customers tab that accepts `.pdf`, `.xlsx`, and `.xls` files, parses them to extract customer fields (name, phone, email, address, company, etc.), shows a preview table of parsed rows, warns on duplicate phone/email matches, and inserts confirmed records as new customers

**User-visible outcome:** Users can set recurring daily reminders with an end date, see all today's reminders in a popup when the app loads, and bulk-import customer records from PDF or Excel files with a preview and duplicate warning before confirming.
