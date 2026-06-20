const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Register
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) return res.status(400).json({ message: "Username or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ _id: newUser._id, username: newUser.username, wins: newUser.wins });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

// Login
exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(400).json({ message: "User not found" });
    if (!user.password) return res.status(400).json({ message: "Please login with Google" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        wins: user.wins
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { email, username, googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
          username,
          email,
          googleId,
          password: ""
      });
      await user.save();
    }

    res.json({
        _id: user._id,
        username: user.username,
        wins: user.wins
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Google Login Error" });
  }
};

// --- פונקציות חדשות (היו חסרות או לא מחוברות) ---

// 1. Leaderboard
exports.getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await User.find({}, 'username wins losses isOnline')
                                      .sort({ wins: -1 })
                                      .limit(10);
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: "Error fetching leaderboard" });
    }
};

// 2. Add Friend
exports.addFriend = async (req, res) => {
    const { userId, friendId } = req.body;
    try {
        if (!userId || !friendId) return res.status(400).json({ message: "Missing User IDs" });

        // עדכון צד א' (אני): הוסף את החבר רק אם הוא לא קיים
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { friends: friendId } }, // $addToSet מונע כפילויות אוטומטית!
            { new: true } // מחזיר את המשתמש המעודכן
        ).populate('friends', 'username isOnline wins'); // מחזיר כבר את הפרטים המעודכנים ללובי

        //  הוסף אותי רק אם אני לא קיים
        const friend = await User.findByIdAndUpdate(
            friendId,
            { $addToSet: { friends: userId } },
            { new: true }
        );

        if (!user || !friend) return res.status(404).json({ message: "User not found" });

        res.json({ message: "Friend added mutually!", friends: user.friends });
    } catch (error) {
        console.error("Add Friend Error:", error);
        res.status(500).json({ message: "Error adding friend" });
    }
};

// 3. Get Friends List
exports.getUserFriends = async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('friends', 'username isOnline wins');
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ message: "Error fetching friends" });
    }
};
// מחיקת משתמש לצמיתות
exports.deleteUser = async (req, res) => {
    const { userId } = req.body;

    try {
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        // 1. הסרת המשתמש מרשימות החברים של כולם (ניקוי שאריות)
        await User.updateMany(
            { friends: userId },
            { $pull: { friends: userId } }
        );

        // 2. מחיקת המשתמש עצמו
        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json({ message: "User account deleted successfully" });

    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).json({ message: "Error deleting account" });
    }
};
// עדכון אימייל
exports.updateEmail = async (req, res) => {
    const { userId, newEmail } = req.body;

    try {
        if (!userId || !newEmail) {
            return res.status(400).json({ message: "Missing user ID or email" });
        }

        const emailExists = await User.findOne({ email: newEmail });

        if (emailExists && emailExists._id.toString() !== userId) {
            return res.status(409).json({ message: "Email is already taken by another user" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { email: newEmail },
            { new: true }
        );

        res.json({
            message: "Email updated successfully",
            user: updatedUser
        });

    } catch (error) {
        console.error("Update Email Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Returns the full profile of one user for the profile screen
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(
            req.params.userId,
            'username email wins losses isOnline avatar createdAt'
        );
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ message: "Error fetching profile" });
    }
};

// Updates username and email together, blocking values already taken
exports.updateProfile = async (req, res) => {
    const { userId, username, email, avatar } = req.body;
    try {
        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (avatar !== undefined) updates.avatar = avatar;

        if (username || email) {
            const orConditions = [];
            if (username) orConditions.push({ username });
            if (email) orConditions.push({ email });

            const clash = await User.findOne({
                _id: { $ne: userId },
                $or: orConditions,
            });
            if (clash) {
                return res.status(409).json({ message: "Username or email already taken" });
            }
        }

        const updated = await User.findByIdAndUpdate(userId, updates, { new: true });
        if (!updated) return res.status(404).json({ message: "User not found" });

        res.json({
            message: "Profile updated",
            user: {
                _id: updated._id,
                username: updated.username,
                email: updated.email,
                wins: updated.wins,
                losses: updated.losses,
                avatar: updated.avatar,
            },
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
