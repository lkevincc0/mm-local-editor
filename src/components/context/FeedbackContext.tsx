import React, {
  createContext,
  useContext,
  useMemo,
  useState
} from "react";

import type {
  Feedback,
  FeedbackStatus
} from "../types.ts";

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
    nodeLabel?: string
  ) => void;

  updateFeedbackStatus: (
    feedbackId: string,
    status: FeedbackStatus
  ) => void;

  deleteFeedback: (
    feedbackId: string
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
  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>([]);

  const [selectedNodeId, setSelectedNodeId] =
    useState<string | null>(null);

  const [
    selectedNodeLabel,
    setSelectedNodeLabel
  ] = useState<string | null>(null);

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
    nodeLabel?: string
  ) => {
    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      nodeId,
      nodeLabel,
      author: "Current User",
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

  const value = useMemo(
    () => ({
      feedbacks,
      selectedNodeId,
      selectedNodeLabel,
      setSelectedNode,
      addFeedback,
      updateFeedbackStatus,
      deleteFeedback
    }),
    [
      feedbacks,
      selectedNodeId,
      selectedNodeLabel
    ]
  );

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