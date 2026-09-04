// cypress/e2e/classic-feedback-layout.cy.ts
// Regression: on the classic model step, opening the feedback column must not
// leave a blank gap on the right — the graph section and feedback column
// together fill the row.

describe("classic feedback layout", () => {
  it("graph section and feedback column fill the row without a gap", () => {
    cy.viewport(1920, 944);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("ammber/ui-theme", '"classic"');
        win.localStorage.setItem("ammber/ui-mode", '"classic"');
      },
    });
    cy.contains("Get started").click();
    cy.contains("New project").click();
    cy.contains("Render Model").click({force: true});
    cy.get('[data-cy="graph-canvas"]').should("be.visible");
    cy.get(".classic-feedback-toggle").click({force: true});
    cy.get(".classic-feedback-column").should("exist");
    cy.wait(500);
    cy.window().then((win) => {
      const feedback = win.document.querySelector(".classic-feedback-column")!;
      const graphSection = feedback.previousElementSibling!;
      const feedbackRect = feedback.getBoundingClientRect();
      const lastSection = graphSection.getBoundingClientRect();

      // feedback column sits flush right of the graph section…
      expect(Math.abs(feedbackRect.left - lastSection.right)).to.be.lessThan(2);
      // …and its right edge is at the row's right edge (no trailing gap)
      expect(feedbackRect.right).to.be.lessThan(win.innerWidth + 1);
      expect(win.innerWidth - feedbackRect.right).to.be.lessThan(80);
    });
  });

  it("graph section fills the row when feedback is closed", () => {
    cy.viewport(1920, 944);
    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.setItem("ammber/ui-theme", '"classic"');
        win.localStorage.setItem("ammber/ui-mode", '"classic"');
      },
    });
    cy.contains("Get started").click();
    cy.contains("New project").click();
    cy.contains("Render Model").click({force: true});
    cy.get('[data-cy="graph-canvas"]').should("be.visible");
    cy.wait(500);
    cy.window().then((win) => {
      expect(win.document.querySelector(".classic-feedback-column")).to.be.null;
      const graph = win.document.querySelector('[data-cy="graph-canvas"]')!
        .closest(".classic-graph-fill")!;
      const rect = graph.getBoundingClientRect();
      expect(win.innerWidth - rect.right).to.be.lessThan(80);
    });
  });
});
