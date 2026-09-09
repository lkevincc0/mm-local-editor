# AMMBER Test Models

This directory contains sample Motivational Models for testing AMMBER.

The models are intended to provide reusable and reasonably realistic test data,
rather than requiring developers to create a new model manually each time a
feature is tested.

## Usage

1. Run AMMBER locally.
2. Import one of the JSON files in this directory.
3. Use the imported model to test model editing, feedback, import/export, and
   related UI behaviour.
4. After making changes, the model can be exported again to verify that its
   structure and feedback data are preserved correctly.

## Test Models

### Student Study Motivation

A model representing a university student's academic and career motivations.

Useful for testing:
- Basic model structure
- Different goal types (`Do`, `Be`, `Feel`, `Concern`, and `Who`)
- Feedback bound to different node types
- Multiple feedback items bound to the same node
- Open and resolved feedback states
- Model import/export

### Healthy Lifestyle

A model representing a student's motivation to maintain a healthier lifestyle.

Useful for testing:
- Multiple branches of `Do` goals
- Feedback across different goal types
- Open and resolved feedback states
- General model editing

### Sustainable Commuting

A model representing motivations for travelling to campus sustainably.

Useful for testing:
- A relatively small model
- Importing and editing a simple model
- Feedback binding across functional and non-functional nodes

### Successful Group Project

A model representing motivations and concerns involved in completing a group
project.

Useful for testing:
- Hierarchical `Do` goals
- Multiple sibling nodes
- Feedback attached at different levels of the hierarchy

### Software Career Preparation

A larger model representing a final-year student's preparation for a software
career.

Useful for testing:
- Larger model structures
- Multiple nested branches
- Models containing many feedback items
- Feedback panel behaviour with a larger amount of test data

## Feedback Data

Some models contain pre-populated feedback for testing the feedback feature.

Feedback may include:
- Feedback bound to individual model nodes
- Multiple feedback items on the same node
- `open` and `resolved` feedback
- Feedback from different example authors

The feedback content is sample test data and is not intended to represent an
authoritative evaluation of the models.

## Notes

These files are test fixtures and may be updated as AMMBER's model or feedback
data format changes.

When changing the JSON import/export format, please verify that the test models
can still be imported successfully and that their model structure and feedback
data are preserved after export.