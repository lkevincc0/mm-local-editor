describe("SVG feedback export", () => {
  [
    {name: "legacy placeholder date", updatedAt: "1970-01-01T00:00:00.000Z", hasDate: false},
    {name: "valid date", updatedAt: "2026-09-03T12:00:00.000Z", hasDate: true},
  ].forEach(({name, updatedAt, hasDate}) => {
    it(`exports readable feedback with ${name}`, () => {
      const goal = {id: 1, instanceId: "1-1", content: "Export goal", type: "Do", children: []};
      const project = {
        id: "svg-export-regression",
        name: "SVG export regression",
        treeData: [goal],
        tabData: ["Do", "Be", "Feel", "Concern", "Who"].map((label) => ({
          label, icon: "", rows: label === "Do" ? [goal] : [],
        })),
        feedbacks: [],
        overallFeedback: {
          author: "Ammber Team",
          content: "Overall this is a solid starting structure -- try filling in the remaining Be/Feel/Concern/Who goals next.\nSecond paragraph.",
          updatedAt,
        },
        createdAt: 1,
        updatedAt: 2,
      };
      const write = cy.stub().resolves().as("saveSvg");
      cy.viewport(1440, 1000);
      cy.visit("/projects", {
        onBeforeLoad(win) {
          win.localStorage.setItem("ammber/projects", JSON.stringify([project]));
          win.localStorage.setItem("ammber/ui-theme", '"classic"');
          win.localStorage.setItem("ammber/ui-mode", '"classic"');
          // Capture the real export at the OS file-picker boundary.
          Object.defineProperty(win, "showSaveFilePicker", {
            configurable: true,
            value: async () => ({
              createWritable: async () => ({write, close: async () => undefined}),
            }),
          });
        },
      });
      cy.contains(project.name).click();
      cy.contains("Render Model").click();
      cy.get('[data-cy="graph-canvas"] svg').should("be.visible");
      cy.contains("button", "Share").click();
      cy.contains("button", /^SVG$/).should("be.enabled").click();
      cy.get("@saveSvg").should("have.been.calledOnce");
      cy.then(() => {
        const blob = write.firstCall.args[0] as Blob;
        expect(blob.type).to.equal("image/svg+xml;charset=utf-8");
        return blob.text();
      }).then((svgString) => {
        // Render the exported file in an isolated document, without app CSS.
        cy.document().then((doc) => {
          const iframe = doc.createElement("iframe");
          iframe.dataset.cy = "export-preview";
          iframe.width = "800";
          iframe.height = "900";
          doc.body.appendChild(iframe);
          const preview = iframe.contentDocument!;
          preview.open();
          preview.write(svgString);
          preview.close();
        });
      });
      cy.get<HTMLIFrameElement>('iframe[data-cy="export-preview"]').should(($frame) => {
        const doc = $frame[0].contentDocument!;
        const svg = doc.querySelector("svg")!;
        const content = Array.from(svg.querySelectorAll("text"))
          .find((text) => text.textContent?.includes("Overall this is"))!;
        expect(content, "feedback text is in the exported file").to.exist;
        const bubble = content.parentElement!;
        const avatar = bubble.querySelector("circle")!;
        const body = bubble.querySelector("rect")!;
        const contentBounds = content.getBBox();
        const avatarBounds = avatar.getBBox();
        const bodyBounds = body.getBBox();
        expect(contentBounds.width, "text has been rendered").to.be.greaterThan(0);
        expect(contentBounds.y, "text clears the avatar").to.be.at.least(avatarBounds.y + avatarBounds.height + 10);
        expect(content.querySelectorAll("tspan").length).to.be.greaterThan(1);
        expect(contentBounds.y + contentBounds.height, "last line stays inside bubble")
          .to.be.lessThan(bodyBounds.y + bodyBounds.height);
        expect(contentBounds.x + contentBounds.width, "text stays inside bubble width")
          .to.be.at.most(bodyBounds.x + bodyBounds.width);
        expect(svg.viewBox.baseVal.height).to.equal(Number(svg.getAttribute("height")));
        expect(bodyBounds.y + bodyBounds.height).to.be.lessThan(svg.viewBox.baseVal.height);
        const date = bubble.querySelector('text[text-anchor="end"]');
        if (hasDate) {
          expect(date?.textContent).to.equal(new Date(updatedAt).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          }));
        } else {
          expect(date, "no placeholder date").to.be.null;
        }
      });
    });
  });
});
