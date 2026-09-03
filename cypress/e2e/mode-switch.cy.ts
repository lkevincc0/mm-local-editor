// cypress/e2e/mode-switch.cy.ts
// Reproduction: switching classic -> modern must apply without a page refresh.

describe("UI mode switch", () => {
  it("applies the modern layout immediately after clicking the switch", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("ammber/ui-theme", '"classic"');
        win.localStorage.setItem("ammber/ui-mode", '"classic"');
      },
    });
    cy.contains("Get started").click();
    cy.contains("New project").click();

    // Classic layout: arrow-steps progress bar present
    cy.contains("Render Model").should("exist");

    cy.get('[aria-label="Switch to modern UI"]').click({force: true});

    // Modern layout should appear without reload: CanvasToolbar pills
    cy.contains("Hierarchy", {timeout: 5000}).should("exist");
    cy.contains("Render Model").should("not.exist");

    // Switch back to classic, again without reload
    cy.get('[aria-label="Switch to classic UI"]').click({force: true});
    cy.contains("Render Model", {timeout: 5000}).should("exist");
  });
});
