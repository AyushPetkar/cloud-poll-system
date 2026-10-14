const express = require('express');
const router = express.Router();
const Poll = require('../models/Poll');

// 1. GET ALL POLLS (with optional search)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      query = {
        $or: [
          { question: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const polls = await Poll.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: polls.length, data: polls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2. GET SINGLE POLL
router.get('/:id', async (req, res) => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    res.json({ success: true, data: poll });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Invalid poll ID' });
  }
});

// 3. CREATE NEW POLL
router.post('/', async (req, res) => {
  try {
    const { question, category, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a question and at least 2 options.',
      });
    }

    // Filter out empty options
    const formattedOptions = options
      .map((opt) => (typeof opt === 'string' ? { text: opt.trim() } : { text: opt.text?.trim() }))
      .filter((opt) => opt.text && opt.text.length > 0);

    if (formattedOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 non-empty options are required.',
      });
    }

    const newPoll = await Poll.create({
      question: question.trim(),
      category: category ? category.trim() : 'General',
      options: formattedOptions,
      totalVotes: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Poll created successfully',
      data: newPoll,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 4. VOTE ON AN OPTION
router.patch('/:id/vote', async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      return res.status(400).json({ success: false, message: 'optionId is required to vote' });
    }

    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    const option = poll.options.id(optionId);
    if (!option) {
      return res.status(404).json({ success: false, message: 'Option not found in this poll' });
    }

    option.votes += 1;
    poll.totalVotes += 1;
    await poll.save();

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: poll,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. UPDATE POLL DETAILS
router.put('/:id', async (req, res) => {
  try {
    const { question, category } = req.body;
    const poll = await Poll.findById(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    if (question) poll.question = question.trim();
    if (category) poll.category = category.trim();

    await poll.save();
    res.json({ success: true, message: 'Poll updated successfully', data: poll });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 6. DELETE POLL (Protected with Admin Key)
router.delete('/:id', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
    const expectedKey = process.env.ADMIN_KEY || 'admin123';

    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid Admin Password',
      });
    }

    const poll = await Poll.findByIdAndDelete(req.params.id);
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }
    res.json({ success: true, message: 'Poll deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
