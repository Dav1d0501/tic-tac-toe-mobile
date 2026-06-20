const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    googleLogin,
    getLeaderboard,
    addFriend,
    getUserFriends,
    deleteUser,
    updateEmail,
    getUserProfile,
    updateProfile
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google-login', googleLogin);
router.delete('/delete', deleteUser);
router.patch('/update-email', updateEmail);
router.patch('/update-profile', updateProfile);
router.get('/leaderboard', getLeaderboard);
router.post('/add-friend', addFriend);
router.get('/friends/:userId', getUserFriends);
router.get('/profile/:userId', getUserProfile);


module.exports = router;
