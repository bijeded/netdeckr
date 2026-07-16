## MODIFIED Requirements

### Requirement: Persistent footer

The app SHALL render a footer that is present both on the main dashboard and on any legal page (`?page=how-it-works`, `?page=privacy`). The footer SHALL be rendered once, at the end of the scrolling main content area (not as a permanently-pinned element at the bottom of the app shell), so it flows after the content and is reached by scrolling to the bottom rather than always occupying the bottom of the viewport. It SHALL still be rendered once, not duplicated per view.

#### Scenario: Footer present on dashboard
- **WHEN** no `?page=` param is set (the dashboard is showing)
- **THEN** the footer is rendered at the end of the dashboard's scrolling main content

#### Scenario: Footer present on legal pages
- **WHEN** `?page=how-it-works` or `?page=privacy` is set
- **THEN** the footer is still rendered, unchanged, at the end of the legal page's scrolling content

#### Scenario: Footer does not reserve fixed viewport space
- **WHEN** the app is viewed at a narrow (mobile) width with content taller than the viewport
- **THEN** the footer is not pinned to the bottom of the viewport and does not reserve fixed vertical space; it becomes visible when the user scrolls to the bottom of the content
