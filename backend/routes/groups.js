const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { getIo } = require('../services/socket');

// Create a new group
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    
    const group = new Group({
      name,
      description,
      type,
      creator: req.user._id,
      members: [{
        user: req.user._id,
        role: 'admin'
      }]
    });

    await group.save();
    await group.populate('members.user', 'name email');

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ message: 'Error creating group' });
  }
});

// Get all public groups and private groups where user is a member
router.get('/', authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [
        { type: 'public' },
        { 'members.user': req.user._id }
      ],
      isActive: true
    })
    .populate('members.user', 'name email')
    .populate('creator', 'name email')
    .sort('-createdAt');

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Get group details
router.get('/:groupId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members.user', 'name email')
      .populate('creator', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user has access to private group
    if (group.type === 'private' && !group.members.some(m => m.user._id.equals(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ message: 'Error fetching group' });
  }
});

// Join a group
router.post('/:groupId/join', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.type === 'private') {
      return res.status(403).json({ message: 'This is a private group' });
    }

    if (group.members.some(m => m.user.equals(req.user._id))) {
      return res.status(400).json({ message: 'Already a member' });
    }

    group.members.push({
      user: req.user._id,
      role: 'member'
    });

    await group.save();
    await group.populate('members.user', 'name email');

    res.json(group);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Error joining group' });
  }
});

// Update member role (admin only)
router.put('/:groupId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is admin
    const requester = group.members.find(m => m.user.equals(req.user._id));
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update roles' });
    }

    const memberIndex = group.members.findIndex(m => m.user.equals(req.params.userId));
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found' });
    }

    group.members[memberIndex].role = role;
    await group.save();
    await group.populate('members.user', 'name email');

    res.json(group);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ message: 'Error updating member role' });
  }
});

// Remove member (admin only)
router.delete('/:groupId/members/:userId', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is admin
    const requester = group.members.find(m => m.user.equals(req.user._id));
    if (!requester || requester.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can remove members' });
    }

    group.members = group.members.filter(m => !m.user.equals(req.params.userId));
    await group.save();

    const io = getIo();
    io.to(`user_${req.params.userId}`).emit('removedFromGroup', {
      groupId: group._id,
      groupName: group.name
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Error removing member' });
  }
});

// Get group messages
router.get('/:groupId/messages', authMiddleware, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.type === 'private' && !group.members.some(m => m.user.equals(req.user._id))) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await Message.find({ group: req.params.groupId })
      .populate('sender', 'name email')
      .sort('createdAt');

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send group message
router.post('/:groupId/messages', authMiddleware, async (req, res) => {
  try {
    const { content, messageType = 'text' } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!group.members.some(m => m.user.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    // For announcements, check if user is admin/moderator
    if (messageType === 'announcement') {
      const member = group.members.find(m => m.user.equals(req.user._id));
      if (!['admin', 'moderator'].includes(member.role)) {
        return res.status(403).json({ message: 'Only admins and moderators can make announcements' });
      }
    }

    const message = new Message({
      group: group._id,
      sender: req.user._id,
      content,
      messageType,
      readBy: [{ user: req.user._id }]
    });

    await message.save();
    await message.populate('sender', 'name email');

    const io = getIo();
    io.to(`group_${group._id}`).emit('newGroupMessage', {
      message,
      groupId: group._id
    });

    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

module.exports = router; 