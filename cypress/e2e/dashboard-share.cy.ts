describe("Dashboard project sharing", () => {
  it("opens a selected project share link as a shared copy", () => {
    const project = {
      id: "cypress-share-project",
      name: "Cypress Share Model",
      treeData: [],
      tabData: [],
      feedbacks: [],
      createdAt: 1000,
      updatedAt: 2000,
    };

    cy.visit("/projects", {
      onBeforeLoad(win) {
        win.localStorage.setItem("ammber/projects", JSON.stringify([project]));
      },
    });

    cy.get('[aria-label="Options for Cypress Share Model"]').click();
    cy.contains(".dropdown-menu", "Share").click();

    cy.contains("Anyone with the link can open this project").should("be.visible");
    cy.contains("Open this project to export it as an image.").should("be.visible");
    cy.contains("button", "PNG").should("be.disabled");
    cy.contains("button", "SVG").should("be.disabled");

    cy.get('input[aria-label="Share link"]')
      .invoke("val")
      .then((value) => {
        const shareUrl = String(value);
        expect(shareUrl).to.include("#share=");
        cy.visit(shareUrl);
      });

    cy.location("pathname").should("include", "/projectEdit");
    cy.window().should((win) => {
      const projects = JSON.parse(win.localStorage.getItem("ammber/projects") ?? "[]");
      const sharedProject = projects.find(
        (candidate: {name: string}) => candidate.name === "Cypress Share Model (shared)"
      );
      expect(sharedProject).to.exist;
      expect(sharedProject.sourceShareId).to.equal("cypress-share-project:2000");
    });
  });
});
