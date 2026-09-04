// cypress/e2e/classic-feedback.cy.ts
// Classic mode: the Feedback toggle at the right end of the arrow-steps
// progress bar must render fully inside the viewport (no clipping).

describe("classic feedback toggle", () => {
  it("keeps the feedback toggle fully within the viewport", () => {
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("ammber/ui-theme", '"classic"');
        win.localStorage.setItem("ammber/ui-mode", '"classic"');
      },
    });
    cy.contains("Get started").click();
    cy.contains("New project").click();

    cy.get(".classic-feedback-toggle", {timeout: 5000})
      .should("be.visible")
      .then(($toggle) => {
        const rect = $toggle[0].getBoundingClientRect();
        cy.window().then((win) => {
          // Allow 1px of sub-pixel rounding; real clipping is tens of px.
          expect(rect.right).to.be.at.most(win.innerWidth + 1);
          expect(rect.left).to.be.at.least(0);
        });
      });

    // Open the panel if it is not open already, then re-check that the
    // toggle still fits with the panel shown.
    cy.get(".classic-feedback-toggle")
      .invoke("attr", "aria-pressed")
      .then((pressed) => {
        if (pressed !== "true") {
          cy.get(".classic-feedback-toggle").click();
        }
      });
    cy.get(".feedback-panel", {timeout: 5000}).should("exist");
    cy.get(".classic-feedback-toggle").then(($toggle) => {
      const rect = $toggle[0].getBoundingClientRect();
      cy.window().then((win) => {
        expect(rect.right).to.be.at.most(win.innerWidth + 1);
      });
    });
  });
});
