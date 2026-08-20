import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";

import type {
  Feedback,
  FeedbackReply,
  FeedbackStatus
} from "../types.ts";

import {useProfileContext} from "./ProfileContext";
import {useProjectContext} from "./ProjectContext";

type FeedbackContextType = {
  feedbacks: Feedback[];

  selectedNodeId: string | null;
  selectedNodeLabel: string | null;

  setSelectedNode: (
    nodeId: string | null,
    nodeLabel?: string | null
  ) => void;

  addFeedback: (
    nodeId: string,
    content: string,
    nodeLabel?: string,
    author?: string
  ) => void;

  updateFeedbackStatus: (
    feedbackId: string,
    status: FeedbackStatus
  ) => void;

  deleteFeedback: (
    feedbackId: string
  ) => void;

  addReply: (
    feedbackId: string,
    content: string
  ) => void;
};

const FeedbackContext =
  createContext<FeedbackContextType | undefined>(
    undefined
  );

type FeedbackProviderProps = {
  children: React.ReactNode;
};

export const FeedbackProvider: React.FC<
  FeedbackProviderProps
> = ({children}) => {
  const {
    currentProject,
    currentProjectId,
    saveProjectData
  } = useProjectContext();

  const {authorName, authorAvatar} =
    useProfileContext();

  // Feedback belongs to the currently open project.
  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>(
      currentProject?.feedbacks ?? []
    );

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [
    selectedNodeLabel,
    setSelectedNodeLabel
  ] = useState<string | null>(null);

  // Load the newly opened project's feedback when switching projects.
  const previousProjectId = useRef(currentProjectId);

  useEffect(() => {
    if (previousProjectId.current === currentProjectId) {
      return;
    }

    previousProjectId.current = currentProjectId;
    setFeedbacks(currentProject?.feedbacks ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // Persist feedback edits into the currently open project.
  useEffect(() => {
    if (currentProjectId) {
      saveProjectData(currentProjectId, {feedbacks});
    }
  }, [feedbacks, currentProjectId, saveProjectData]);

  // When the author changes, keep existing feedback and replies in sync.
  const previousAuthor = useRef({
    name: authorName,
    avatar: authorAvatar
  });

  useEffect(() => {
    if (
      previousAuthor.current.name === authorName &&
      previousAuthor.current.avatar === authorAvatar
    ) {
      return;
    }

    previousAuthor.current = {
      name: authorName,
      avatar: authorAvatar
    };

    setFeedbacks((currentFeedbacks) =>
      currentFeedbacks.map((feedback) => ({
        ...feedback,
        author:
          authorName.trim() || feedback.author,
        authorAvatar:
          authorAvatar || feedback.authorAvatar,
        replies: (feedback.replies ?? []).map(
          (reply) => ({
            ...reply,
            author:
              authorName.trim() || reply.author,
            authorAvatar:
              authorAvatar || reply.authorAvatar
          })
        )
      }))
    );
  }, [authorName, authorAvatar]);

  const setSelectedNode = (
    nodeId: string | null,
    nodeLabel?: string | null
  ) => {
    setSelectedNodeId(nodeId);

    setSelectedNodeLabel(
      nodeLabel ?? nodeId ?? null
    );
  };

  const addFeedback = (
    nodeId: string,
    content: string,
    nodeLabel?: string,
    author?: string
  ) => {
    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      nodeId,
      nodeLabel,
      author:
        (author ?? authorName).trim() ||
        "Current User",
      authorAvatar: authorAvatar || undefined,
      content,
      createdAt: "Just now",
      status: "open",
      replyCount: 0
    };

    setFeedbacks((currentFeedbacks) => [
      newFeedback,
      ...currentFeedbacks
    ]);
  };

  const updateFeedbackStatus = (
    feedbackId: string,
    status: FeedbackStatus
  ) => {
    setFeedbacks((currentFeedbacks) =>
      currentFeedbacks.map((feedback) =>
        feedback.id === feedbackId
          ? {
              ...feedback,
              status
            }
          : feedback
      )
    );
  };

  const deleteFeedback = (feedbackId: string) => {
    setFeedbacks((currentFeedbacks) =>
      currentFeedbacks.filter(
        (feedback) => feedback.id !== feedbackId
      )
    );
  };

  const addReply = (
    feedbackId: string,
    content: string
  ) => {
    const reply: FeedbackReply = {
      id: `reply-${Date.now()}`,
      author:
        authorName.trim() || "Current User",
      authorAvatar: authorAvatar || undefined,
      content,
      createdAt: "Just now"
    };

    setFeedbacks((currentFeedbacks) =>
      currentFeedbacks.map((feedback) =>
        feedback.id === feedbackId
          ? {
              ...feedback,
              replies: [
                ...(feedback.replies ?? []),
                reply
              ],
              replyCount:
                (feedback.replyCount ?? 0) + 1
            }
          : feedback
      )
    );
  };

  const value = {
    feedbacks,
    selectedNodeId,
    selectedNodeLabel,
    setSelectedNode,
    addFeedback,
    updateFeedbackStatus,
    deleteFeedback,
    addReply
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};

export const useFeedbackContext = () => {
  const context =
    useContext(FeedbackContext);

  if (!context) {
    throw new Error(
      "useFeedbackContext must be used inside a FeedbackProvider"
    );
  }

  return context;
};
