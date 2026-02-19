/**
 * Export all activities.
 *
 * Activities must be exported from this index file to be registered with the worker.
 */

import { Context, type Info } from "@temporalio/activity";

import * as databaseActivities from "@/lib/activities/database";
import * as emailActivities from "@/lib/activities/email";
import * as helloActivities from "@/lib/activities/hello";
import { runWithLogContext } from "@/lib/logging/context";

type ActivityModule = Record<string, unknown>;
type ActivityFunction = (...args: unknown[]) => unknown;

function getActivityInfo(): Info | undefined {
  try {
    return Context.current().info;
  } catch {
    return undefined;
  }
}

function wrapActivityFunction(name: string, fn: ActivityFunction): ActivityFunction {
  return async (...args: unknown[]) => {
    const info = getActivityInfo();

    return await runWithLogContext(
      {
        service: "worker",
        activity: info?.activityType ?? name,
        activityId: info?.activityId,
        workflowId: info?.workflowExecution.workflowId,
        workflowRunId: info?.workflowExecution.runId,
        taskQueue: info?.taskQueue,
        attempt: info?.attempt,
      },
      async () => await fn(...args)
    );
  };
}

function wrapActivities<T extends ActivityModule>(activityModule: T): T {
  const wrappedEntries = Object.entries(activityModule).map(([name, value]) => {
    if (typeof value !== "function") {
      return [name, value];
    }

    return [name, wrapActivityFunction(name, value as ActivityFunction)];
  });

  return Object.fromEntries(wrappedEntries) as T;
}

const wrappedHelloActivities = wrapActivities(helloActivities);
const wrappedDatabaseActivities = wrapActivities(databaseActivities);
const wrappedEmailActivities = wrapActivities(emailActivities);

export const greet = wrappedHelloActivities.greet as typeof helloActivities.greet;
export const sendHelloEmail = wrappedHelloActivities.sendHelloEmail as typeof helloActivities.sendHelloEmail;

export const createTask = wrappedDatabaseActivities.createTask as typeof databaseActivities.createTask;
export const setWorkflowStatus = wrappedDatabaseActivities.setWorkflowStatus as typeof databaseActivities.setWorkflowStatus;
export const setWorkflowExecutionState =
  wrappedDatabaseActivities.setWorkflowExecutionState as typeof databaseActivities.setWorkflowExecutionState;
export const setWorkflowProgress =
  wrappedDatabaseActivities.setWorkflowProgress as typeof databaseActivities.setWorkflowProgress;
export const updateContact = wrappedDatabaseActivities.updateContact as typeof databaseActivities.updateContact;
export const updateTask = wrappedDatabaseActivities.updateTask as typeof databaseActivities.updateTask;
export const notifyUsers = wrappedDatabaseActivities.notifyUsers as typeof databaseActivities.notifyUsers;
export const getTask = wrappedDatabaseActivities.getTask as typeof databaseActivities.getTask;
export const getWorkflowDefinition =
  wrappedDatabaseActivities.getWorkflowDefinition as typeof databaseActivities.getWorkflowDefinition;

export const sendEmail = wrappedEmailActivities.sendEmail as typeof emailActivities.sendEmail;
export const sendWelcomeEmail = wrappedEmailActivities.sendWelcomeEmail as typeof emailActivities.sendWelcomeEmail;
export const sendRejectionEmail = wrappedEmailActivities.sendRejectionEmail as typeof emailActivities.sendRejectionEmail;
