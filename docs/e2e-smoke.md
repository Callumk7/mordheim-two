# Form E2E smoke scope

This is the intentionally small browser smoke scope for the match and event forms. Run it against a seeded local database with at least two warbands, a warrior in each warband, and a match containing both warbands.

## React Aria controls

- Open **New match** and operate the status select and participant checkboxes with both pointer and keyboard. Confirm labels announce the controls, selection is visible, and focus can move through the form.
- Open **New event** and operate each match, warband, and warrior select with both pointer and keyboard. Changing the match resets both combatants; changing either warband resets only that side's warrior to its first available warrior.

## Disabled states

- In a new match, confirm **Create match** is disabled while either name or scenario is blank or whitespace-only and becomes enabled when both contain text.
- In an event form, confirm submit is disabled until attacker and defender are distinct participants in the selected match and each selected warrior belongs to its selected warband. Selecting the same warband on both sides shows the inline validation message.
- On a match detail page with fewer than two staffed participating warbands, confirm both **Add event** buttons are disabled.
- Edit a match that already has an event. Confirm participant checkboxes used by the event are disabled, explain why they are locked, and cannot be deselected with pointer or keyboard.

## Persistence errors

- Make match creation/update persistence fail and submit the form. Confirm the dialog remains open, the returned error message (or the match fallback message) is presented, and submit is enabled again.
- Make event creation/update persistence fail and submit the form. Confirm the dialog or edit form remains visible, the returned error message (or the event fallback message) is presented, and submit is enabled again.

## Successful dialog closure

- Successfully create a match and confirm the **New match** dialog closes only after persistence completes and the match appears in the list.
- Successfully create an event from the events index and from a match detail page. Confirm the dialog closes only after persistence completes and the event appears in the corresponding table.
- Confirm persistence failure never closes any of these dialogs.
