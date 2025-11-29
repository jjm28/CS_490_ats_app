import AutomationRule from "../models/automationRule.js";

// CREATE
export const createAutomationRule = async (req, res) => {
  try {
    const rule = await AutomationRule.create(req.body);
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: "Failed to create rule" });
  }
};

// GET ALL
export const getAutomationRules = async (req, res) => {
  try {
    const rules = await AutomationRule.find().sort({ createdAt: -1 });
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: "Failed to load rules" });
  }
};

// GET ONE
export const getAutomationRuleById = async (req, res) => {
  try {
    const rule = await AutomationRule.findById(req.params.id);
    res.json(rule);
  } catch (err) {
    res.status(500).json({ error: "Rule not found" });
  }
};

// UPDATE
export const updateAutomationRule = async (req, res) => {
  try {
    const updated = await AutomationRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update rule" });
  }
};

// DELETE
export const deleteAutomationRule = async (req, res) => {
  try {
    await AutomationRule.findByIdAndDelete(req.params.id);
    res.json({ message: "Rule deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete rule" });
  }
};