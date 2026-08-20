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
    content: string
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

// Demo feedback attached to the "Do1" node (goal id 6, instanceId "6-1"),
// whose graph cell id is "Functional-6-1".
const initialFeedbacks: Feedback[] = [
  {
    id: "feedback-1",
    nodeId: "Functional-6-1",
    author: "Kevin",
    content:
      "The boundary and purpose of Do1 could be clarified.",
    createdAt: "10 min ago",
    status: "open",
    replyCount: 1
  },
  {
    id: "feedback-2",
    nodeId: "Functional-6-1",
    author: "Alice",
    content:
      "The relationship between Do1 and Do2 could be explained more clearly.",
    createdAt: "Yesterday",
    status: "resolved",
    replyCount: 2
  },
  {
    id: "feedback-3",
    nodeId: "Functional-6-1",
    author: "Sam",
    content:
      "Consider adding more detail about the expected outcome of this goal.",
    createdAt: "2 days ago",
    status: "open",
    replyCount: 0
  }
];

export const FeedbackProvider: React.FC<
  FeedbackProviderProps
> = ({children}) => {
  const [feedbacks, setFeedbacks] =
    useState<Feedback[]>(initialFeedbacks);

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
    content: string
  ) => {
    const newFeedback: Feedback = {
      id: `feedback-${Date.now()}`,
      nodeId,
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