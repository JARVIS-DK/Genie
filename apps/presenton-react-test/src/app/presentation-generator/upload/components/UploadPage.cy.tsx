/// <reference types="cypress" />

import React from "react";
import UploadPage from "./UploadPage";
import { mount } from "cypress/react";
import { store } from "../../../../store/store";
import { Provider } from "react-redux";

// Import global styles
import "../../../../app/globals.css";

interface MockRouter {
  push: Cypress.Agent<sinon.SinonSpy>;
  back: Cypress.Agent<sinon.SinonSpy>;
  forward: Cypress.Agent<sinon.SinonSpy>;
  refresh: Cypress.Agent<sinon.SinonSpy>;
  replace: Cypress.Agent<sinon.SinonSpy>;
  prefetch: Cypress.Agent<sinon.SinonSpy>;
  route: string;
  pathname: string;
  query: Record<string, any>;
  asPath: string;
}

// ✅ A simple mock router independent of Next.js
const createRouter = (): MockRouter => ({
  push: cy.stub().as("router.push"),
  back: cy.stub(),
  forward: cy.stub(),
  refresh: cy.stub(),
  replace: cy.stub(),
  prefetch: cy.stub(),
  route: "/",
  pathname: "/",
  query: {},
  asPath: "/",
});

// ✅ Type for mount wrapper
interface RouterWrapperProps {
  children: React.ReactNode;
}

// ✅ Custom Cypress mount including Redux
Cypress.Commands.add(
  "mount",
  (component: React.ReactNode, options = {}): ReturnType<typeof mount> => {
    const router = createRouter();

    const RouterWrapper = ({ children }: RouterWrapperProps) => (
      <Provider store={store}>{children}</Provider>
    );

    return mount(<RouterWrapper>{component}</RouterWrapper>, options);
  }
);

// ✅ Toast checker helper
const checkToast = (message: string) => {
  cy.get('[role="status"]', { timeout: 5000 })
    .should("exist")
    .and("contain", message);
};

// ✅ TESTS
describe("<UploadPage />", () => {
  beforeEach(() => {
    cy.viewport(1440, 900);

    cy.intercept("POST", "**/ppt/generate*", {
      statusCode: 200,
      body: { id: "test-id" },
    }).as("createPresentation");

    cy.intercept("POST", "**/ppt/titles/generate*", {
      statusCode: 200,
      body: { id: "test-id", titles: ["Title 1", "Title 2"] },
    }).as("generateTitles");

    cy.intercept("POST", "**/ppt/create", {
      statusCode: 200,
      body: { id: "test-id" },
    }).as("getQuestions");

    cy.mount(<UploadPage />);
  });

  describe("Configuration Selection", () => {
    it("should allow selecting number of slides", () => {
      cy.get('[data-testid="slides-select"]').click({ force: true });
      cy.get('[role="option"]').contains("12").click();
      cy.get('[data-testid="slides-select"]').should("contain", "12");
    });

    it("should allow selecting language", () => {
      cy.get('[data-testid="language-select"]').click({ force: true });
      cy.get('[role="option"]').contains("Chinese").click();
      cy.get('[data-testid="language-select"]').should("contain", "Chinese");
    });
  });

  describe("Prompt Input", () => {
    it("should allow entering prompt text", () => {
      const testPrompt = "Create a presentation about AI";
      cy.get('[data-testid="prompt-input"]').type(testPrompt);
      cy.get('[data-testid="prompt-input"]').should("have.value", testPrompt);
    });

    it("should toggle research mode", () => {
      cy.get('[data-testid="research-mode-switch"]').click();
      cy.get('[data-testid="research-mode-switch"]').should(
        "have.attr",
        "aria-checked",
        "true"
      );
    });
  });

  describe("File Upload", () => {
    it("should handle document uploads", () => {
      cy.fixture("example.txt").as("testFile");
      cy.get('[data-testid="file-upload-input"]').selectFile("@testFile", {
        force: true,
      });
      cy.contains("example.txt").should("exist");
      checkToast("Files selected");
    });
  });

  describe("File Handling", () => {
    beforeEach(() => {
      cy.writeFile("cypress/fixtures/test-doc.txt", "Test content");
    });

    it("should handle multiple document uploads", () => {
      const file1 = new File(["content1"], "document1.txt", {
        type: "text/plain",
      });
      const file2 = new File(["content2"], "document2.txt", {
        type: "text/plain",
      });

      cy.get('[data-testid="file-upload-input"]').selectFile(
        [
          { contents: file1, fileName: "document1.txt" },
          { contents: file2, fileName: "document2.txt" },
        ],
        { force: true }
      );

      cy.get('[data-testid="file-list"]').within(() => {
        cy.contains("document1.txt").should("exist");
        cy.contains("document2.txt").should("exist");
      });

      checkToast("Files selected");
    });

    it("should handle image uploads", () => {
      const imageFile = new File(["image"], "image.jpg", {
        type: "image/jpeg",
      });

      cy.get('[data-testid="file-upload-input"]').selectFile(
        { contents: imageFile, fileName: "image.jpg", mimeType: "image/jpeg" },
        { force: true }
      );

      cy.get('[data-testid="file-list"]').contains("image.jpg").should("exist");
      checkToast("Files selected");
    });
  });

  describe("Validation", () => {
    it("should show error when no prompt or files", () => {
      cy.contains("button", "Next").click();
      checkToast("No Prompt or Document Provided");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", () => {
      cy.intercept("POST", "**/ppt/create", {
        statusCode: 500,
        body: { error: "Server error" },
      }).as("apiError");

      cy.get('[data-testid="prompt-input"]').type("Test");
      cy.contains("button", "Next").click();

      checkToast("Failed to generate presentation");
    });
  });
});
