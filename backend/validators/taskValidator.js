import Joi from "joi";

const fields = {
  title: Joi.string().trim().max(120),
  description: Joi.string().trim().allow(""),
  status: Joi.string().valid("todo", "in_progress", "done"),
  priority: Joi.string().valid("low", "medium", "high"),
  dueDate: Joi.date().allow(null),
  assignee: Joi.string().hex().length(24).allow(null),
};

export const createTaskSchema = Joi.object({
  ...fields,
  title: fields.title.required(),
});

export const updateTaskSchema = Joi.object(fields).min(1);
