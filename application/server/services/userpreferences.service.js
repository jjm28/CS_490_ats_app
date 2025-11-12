// services/userPreferences.service.js
import { UserPreferences } from "../models/jobs.js";

// Get all user preferences (includes savedSearches array and lastSearch)
export async function getUserPreferences({ userId }) {
  return UserPreferences.findOne({ userId }).lean();
}

// Save/update last used search (auto-saved)
export async function saveLastSearch({ userId, search }) {
  return UserPreferences.findOneAndUpdate(
    { userId },
    { $set: { lastSearch: search } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
}

// Create a new named saved search
export async function createSavedSearch({ userId, name, search }) {
  return UserPreferences.findOneAndUpdate(
    { userId },
    { 
      $push: { 
        savedSearches: {
          name,
          ...search
        }
      }
    },
    { new: true, upsert: true, runValidators: true }
  ).lean();
}

// Update an existing saved search by ID
export async function updateSavedSearch({ userId, searchId, name, search }) {
  return UserPreferences.findOneAndUpdate(
    { 
      userId,
      'savedSearches._id': searchId
    },
    { 
      $set: {
        'savedSearches.$.name': name,
        'savedSearches.$.searchQuery': search.searchQuery,
        'savedSearches.$.statusFilter': search.statusFilter,
        'savedSearches.$.industryFilter': search.industryFilter,
        'savedSearches.$.locationFilter': search.locationFilter,
        'savedSearches.$.salaryMinFilter': search.salaryMinFilter,
        'savedSearches.$.salaryMaxFilter': search.salaryMaxFilter,
        'savedSearches.$.deadlineStartFilter': search.deadlineStartFilter,
        'savedSearches.$.deadlineEndFilter': search.deadlineEndFilter,
        'savedSearches.$.sortBy': search.sortBy
      }
    },
    { new: true, runValidators: true }
  ).lean();
}

// Delete a saved search by ID
export async function deleteSavedSearch({ userId, searchId }) {
  return UserPreferences.findOneAndUpdate(
    { userId },
    { 
      $pull: { 
        savedSearches: { _id: searchId }
      }
    },
    { new: true }
  ).lean();
}

// Delete all user preferences
export async function deleteUserPreferences({ userId }) {
  return UserPreferences.findOneAndDelete({ userId });
}