// Cloud Poll Frontend Logic
// Three-Tier Architecture: Presentation Layer (Netlify) -> Application Layer (Render) -> Database (MongoDB Atlas)

const PRODUCTION_API = 'https://cloud-poll-system.onrender.com';
const DEFAULT_API = localStorage.getItem('CLOUD_POLL_API') || PRODUCTION_API;

let API_BASE_URL = DEFAULT_API;
let currentRoom = localStorage.getItem('CLOUD_POLL_ROOM') || 'general';
let allPolls = [];

// DOM Elements
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const apiStatusMessage = document.getElementById('apiStatusMessage');
const backendDot = document.getElementById('backendDot');
const roomCodeInput = document.getElementById('roomCodeInput');
const switchRoomBtn = document.getElementById('switchRoomBtn');
const currentRoomDisplay = document.getElementById('currentRoomDisplay');
const formRoomDisplay = document.getElementById('formRoomDisplay');
const createPollForm = document.getElementById('createPollForm');
const pollQuestion = document.getElementById('pollQuestion');
const pollCategory = document.getElementById('pollCategory');
const optionsContainer = document.getElementById('optionsContainer');
const addOptionBtn = document.getElementById('addOptionBtn');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const pollsList = document.getElementById('pollsList');
const toastContainer = document.getElementById('toastContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  apiUrlInput.value = API_BASE_URL;
  if (roomCodeInput) roomCodeInput.value = currentRoom;
  updateRoomDisplays();
  checkBackendHealth();
  fetchPolls();
  setupEventListeners();
});

function updateRoomDisplays() {
  if (currentRoomDisplay) currentRoomDisplay.textContent = currentRoom;
  if (formRoomDisplay) formRoomDisplay.textContent = currentRoom;
}

function setupEventListeners() {
  // Connect / Save API URL
  saveApiBtn.addEventListener('click', () => {
    let url = apiUrlInput.value.trim().replace(/\/+$/, '');
    if (!url) return showToast('Please enter a valid API URL', 'error');
    API_BASE_URL = url;
    localStorage.setItem('CLOUD_POLL_API', API_BASE_URL);
    showToast('API Endpoint saved!', 'success');
    checkBackendHealth();
    fetchPolls();
  });

  // Switch Room / Group Code
  if (switchRoomBtn) {
    switchRoomBtn.addEventListener('click', () => {
      const code = (roomCodeInput.value || '').trim().toLowerCase() || 'general';
      currentRoom = code;
      localStorage.setItem('CLOUD_POLL_ROOM', currentRoom);
      updateRoomDisplays();
      showToast(`Entered Private Room: "${currentRoom}"`, 'info');
      fetchPolls();
    });
  }

  if (roomCodeInput) {
    roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') switchRoomBtn.click();
    });
  }

  // Dynamic Options
  addOptionBtn.addEventListener('click', () => {
    const currentOptions = document.querySelectorAll('.option-row').length;
    if (currentOptions >= 6) {
      return showToast('Maximum 6 options allowed', 'error');
    }
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <input type="text" class="poll-option-input" placeholder="Option ${currentOptions + 1}" required />
      <button type="button" class="btn btn-icon btn-remove" title="Remove">&times;</button>
    `;
    optionsContainer.appendChild(row);

    row.querySelector('.btn-remove').addEventListener('click', () => {
      if (document.querySelectorAll('.option-row').length <= 2) {
        return showToast('A poll must have at least 2 options', 'error');
      }
      row.remove();
    });
  });

  // Create Poll Form Submit
  createPollForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = pollQuestion.value.trim();
    const category = pollCategory.value.trim() || 'General';
    const optionInputs = document.querySelectorAll('.poll-option-input');
    const options = Array.from(optionInputs)
      .map((input) => input.value.trim())
      .filter((text) => text.length > 0);

    if (options.length < 2) {
      return showToast('Please provide at least 2 valid options', 'error');
    }

    try {
      showToast('Creating poll...', 'info');
      const response = await fetch(`${API_BASE_URL}/api/polls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, category, options, groupCode: currentRoom }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create poll');
      }

      // Save creator token so only this browser can delete this poll
      if (result.creatorToken && result.data && result.data._id) {
        localStorage.setItem('creator_' + result.data._id, result.creatorToken);
      }

      showToast('Poll created successfully! You are the creator.', 'success');
      createPollForm.reset();
      pollCategory.value = 'Technology';
      // Reset options back to 2 rows
      optionsContainer.innerHTML = `
        <div class="option-row">
          <input type="text" class="poll-option-input" placeholder="Option 1" required />
        </div>
        <div class="option-row">
          <input type="text" class="poll-option-input" placeholder="Option 2" required />
        </div>
      `;
      fetchPolls();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Search filter
  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderPolls(allPolls);
      return;
    }
    const filtered = allPolls.filter(
      (p) =>
        p.question.toLowerCase().includes(term) ||
        (p.category && p.category.toLowerCase().includes(term))
    );
    renderPolls(filtered);
  });

  // Refresh
  refreshBtn.addEventListener('click', () => {
    checkBackendHealth();
    fetchPolls();
  });
}

// 1. Healthcheck
async function checkBackendHealth() {
  apiStatusMessage.textContent = 'Connecting to server...';
  apiStatusMessage.className = 'status-msg';

  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (res.ok) {
      const data = await res.json();
      backendDot.className = 'dot active';
      apiStatusMessage.textContent = 'Server Connected';
      apiStatusMessage.className = 'status-msg connected';
    } else {
      throw new Error();
    }
  } catch (err) {
    backendDot.className = 'dot error';
    apiStatusMessage.textContent = 'Server Offline (Check URL)';
    apiStatusMessage.className = 'status-msg failed';
  }
}

// 2. Fetch Polls (GET /api/polls?group=...)
async function fetchPolls() {
  try {
    pollsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading polls for room <strong>"${escapeHtml(currentRoom)}"</strong>...</p>
      </div>
    `;

    const res = await fetch(`${API_BASE_URL}/api/polls?group=${encodeURIComponent(currentRoom)}`);
    if (!res.ok) throw new Error('Could not fetch polls from backend');
    const result = await res.json();

    allPolls = result.data || [];
    renderPolls(allPolls);
  } catch (err) {
    pollsList.innerHTML = `
      <div class="empty-state">
        <p style="color: var(--danger); font-weight: 600;">⚠️ Connection Failed</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">
          Make sure your backend server is running and the API endpoint above is reachable.
        </p>
      </div>
    `;
  }
}

// 3. Render Polls Cards
function renderPolls(polls) {
  if (!polls || polls.length === 0) {
    pollsList.innerHTML = `
      <div class="empty-state">
        <p>No active polls found in room <strong>"${escapeHtml(currentRoom)}"</strong>.</p>
        <p style="font-size: 0.85rem; margin-top: 0.4rem;">
          You are the first one here! Create a poll on the left for your group.
        </p>
      </div>
    `;
    return;
  }

  pollsList.innerHTML = '';

  polls.forEach((poll) => {
    const totalVotes = poll.totalVotes || 0;
    const pollCard = document.createElement('div');
    pollCard.className = 'poll-item';

    // Check if current user already voted on this poll
    const userVotedOptionId = localStorage.getItem('voted_' + poll._id);
    const hasVoted = Boolean(userVotedOptionId);

    let optionsHTML = '';
    poll.options.forEach((opt) => {
      const votes = opt.votes || 0;
      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
      const isMyVote = userVotedOptionId === opt._id;

      const cardClasses = ['option-card'];
      if (hasVoted) cardClasses.push('disabled');
      if (isMyVote) cardClasses.push('my-vote');

      const clickAction = hasVoted
        ? `showToast('You have already voted on this poll', 'info')`
        : `castVote('${poll._id}', '${opt._id}')`;

      const myVoteBadge = isMyVote ? `<span class="my-vote-pill">✓ Your Vote</span>` : '';

      optionsHTML += `
        <div class="${cardClasses.join(' ')}" onclick="${clickAction}" title="${hasVoted ? 'You already voted on this poll' : 'Click to vote for ' + escapeHtml(opt.text)}">
          <div class="option-progress-bg" style="width: ${percentage}%"></div>
          <div class="option-content">
            <span class="option-label">🗳️ ${escapeHtml(opt.text)} ${myVoteBadge}</span>
            <span class="option-stats">${votes} ${votes === 1 ? 'vote' : 'votes'} (${percentage}%)</span>
          </div>
        </div>
      `;
    });

    const formattedDate = new Date(poll.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const votedStatusBadge = hasVoted
      ? `<span class="poll-voted-notice">✓ Vote Recorded</span>`
      : '';

    // Check if current user is the creator of this poll
    const isCreator = Boolean(localStorage.getItem('creator_' + poll._id));
    const creatorBadge = isCreator ? `<span class="creator-badge">👑 You Created This</span>` : '';
    const deleteButtonHTML = isCreator
      ? `<button class="btn-delete" onclick="deletePoll('${poll._id}')" title="Delete your poll">🗑️ Delete (Creator)</button>`
      : '';

    pollCard.innerHTML = `
      <div class="poll-meta">
        <div>
          <span class="poll-category">${escapeHtml(poll.category || 'General')}</span>
          ${votedStatusBadge}
        </div>
        <span class="poll-total-votes">Total: ${totalVotes} ${totalVotes === 1 ? 'vote' : 'votes'}</span>
      </div>
      <h3 class="poll-title">${escapeHtml(poll.question)}</h3>
      <div class="poll-options">
        ${optionsHTML}
      </div>
      <div class="poll-footer">
        <span>Created: ${formattedDate} ${creatorBadge}</span>
        ${deleteButtonHTML}
      </div>
    `;

    pollsList.appendChild(pollCard);
  });
}

// 4. Cast Vote (PATCH /api/polls/:id/vote)
async function castVote(pollId, optionId) {
  // Prevent duplicate voting
  if (localStorage.getItem('voted_' + pollId)) {
    return showToast('You have already voted on this poll!', 'error');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/polls/${pollId}/vote`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Failed to submit vote');
    }

    // Save vote to lock in user choice
    localStorage.setItem('voted_' + pollId, optionId);
    showToast('Your vote has been counted!', 'success');

    // Update local poll data for smooth immediate render
    const updatedIndex = allPolls.findIndex((p) => p._id === pollId);
    if (updatedIndex !== -1) {
      allPolls[updatedIndex] = result.data;
      renderPolls(allPolls);
    } else {
      fetchPolls();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 5. Delete Poll (DELETE /api/polls/:id - Only the Creator can delete)
async function deletePoll(pollId) {
  const creatorToken = localStorage.getItem('creator_' + pollId);

  // If this user is not the creator, require the master admin override key
  if (!creatorToken) {
    const adminPassword = prompt('🔒 Only the creator of this poll can delete it.\nIf you are an administrator, enter the master key:');
    if (!adminPassword || !adminPassword.trim()) return;
    return executeDelete(pollId, { 'x-admin-key': adminPassword.trim() });
  }

  if (!confirm('Are you sure you want to delete your poll?')) return;
  executeDelete(pollId, { 'x-creator-token': creatorToken });
}

async function executeDelete(pollId, authHeaders) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/polls/${pollId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
    });

    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.message || 'Unauthorized: Only the creator can delete this poll');
    }

    localStorage.removeItem('creator_' + pollId);
    localStorage.removeItem('voted_' + pollId);
    showToast('Your poll has been deleted', 'success');
    allPolls = allPolls.filter((p) => p._id !== pollId);
    renderPolls(allPolls);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Helpers
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
