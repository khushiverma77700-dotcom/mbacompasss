# Make the Admin Text Editor Fully Functional

## What will change
- Correct the font-size control so it reflects the text at the cursor or the selected text instead of always showing 16px.
- Preserve selections reliably while using toolbar menus, then apply size and font changes to the intended text.
- Add an advanced text-colour control with useful presets, a custom colour picker, the current colour indicator, and a reset option.
- Improve toolbar clarity and mobile wrapping without changing saved article, college, exam, or email content.

## Validation
- Test mixed 10px, 12px, 14px, and 16px content and confirm the control updates while moving the cursor.
- Test selected and unselected text for font size, font family, text colour, and reset formatting.
- Confirm saved HTML retains formatting and the project preview builds cleanly.

## Technical details
- Keep the shared Tiptap editor as the single implementation used throughout Admin.
- Subscribe the toolbar state to editor selection and transaction changes.
- Use Tiptap's Color/TextStyle marks so colour and font-size HTML remains portable across all existing editor consumers.
