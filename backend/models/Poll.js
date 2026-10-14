const mongoose = require('mongoose');

const OptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Option text is required'],
    trim: true,
  },
  votes: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const PollSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    groupCode: {
      type: String,
      default: 'general',
      trim: true,
      lowercase: true,
      index: true,
    },
    options: {
      type: [OptionSchema],
      validate: [
        (val) => val.length >= 2,
        'A poll must have at least 2 options',
      ],
    },
    totalVotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Poll', PollSchema);
