# Clinical Queue System: Edge Cases & Decisions

As we evolved the queue management system, we encountered and handled several edge cases to ensure a robust and realistic clinical workflow. Below is a detailed log of these edge cases and the architectural/UI decisions made to counter them.

## 1. Doctor Availability and "Inactive" Status
**Scenario**: A doctor needs to leave or take a long break but still has patients waiting. If they log out, what happens to their queue?
**Decision**: We introduced an `isActive` toggle on the Doctor Profile. 
- If `isActive = false`, the receptionist **cannot** add new patients to their queue (they won't show up in the public display or receptionist assignment dropdown).
- However, if the doctor still has patients in their waiting list, the doctor must continue to serve them. The system allows them to process the existing queue even while inactive.

## 2. Pacing Patient Intake (The "Break" Edge Case)
**Scenario**: Previously, when a doctor completed a patient, the system *automatically* marked the next waiting patient as "serving". This didn't account for doctors needing a 2-minute break between patients.
**Decision**: We decoupled the actions. 
- **Complete/Skip** will now *only* close the current session.
- **Next** must be explicitly pressed by the doctor when they are physically ready for the next patient to enter the room.

## 3. Strict Role Segregation
**Scenario**: Receptionists or Admins could accidentally advance a doctor's queue, causing confusion in the clinic.
**Decision**: "Complete", "Skip", and "Next" actions are now strictly restricted to the `Doctor` role. Receptionists handle *intake* (adding to the queue), while Doctors handle *processing* (advancing the queue).

## 4. Token Uniqueness and Data Integrity
**Scenario**: If multiple receptionists are assigning patients simultaneously, token numbers could overlap or reset unexpectedly.
**Decision**: The token generation uses an atomic increment sequence for the day. Tokens are globally unique for the day across all doctors to avoid confusion like "I am token 5 for Dr. Smith, but he is token 5 for Dr. Jones".

## 5. Automated Email Timing 
**Scenario**: If we email every patient immediately, those far down the queue might show up hours early and crowd the waiting room.
**Decision**: The system emails the top 3 patients immediately upon registration. For anyone placed 4th or higher, they receive their automated email *only when they advance to the 3rd position* in the waiting list. This keeps the physical waiting room less crowded.

## 6. Default Doctor State
**Scenario**: When an admin creates a new doctor, should they immediately be available for patients?
**Decision**: No. Newly created doctors default to `isActive: false`. They must log in with their credentials and manually toggle themselves to active when they arrive at the clinic.

## 7. Form Validation Bypassing
**Scenario**: Browsers handle HTML5 form validations differently, sometimes allowing users to bypass constraints or displaying ugly, non-themed error popups.
**Decision**: We disabled native browser validation (`noValidate`) and built a custom validation engine in React that strictly enforces a 10-digit phone number, proper email regex, and mandatory fields, complete with animated UI feedback matching the system's aesthetic.
