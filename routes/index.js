var express = require('express');
var router = express.Router();

var cors = require('cors');
const passport = require('passport');
require('../passport.js');

let mainController = require('../controllers/mainController');
let authController = require('../controllers/authController');

router.use(cors());

router.get('/', async (req,res,next) => {
    res.render('index');
})

/*Set up Game*/
router.post('/addPlayer', passport.authenticate('jwt',{session: false}), mainController.add_player_post);
router.post('/removePlayer', passport.authenticate('jwt',{session: false}), mainController.remove_player_post);
router.get('/startGame', passport.authenticate('jwt',{session: false}), mainController.start_game_get);

/* In Game*/
router.get('/board', passport.authenticate('jwt',{session: false}), mainController.board_get);
router.get('/boardSummary', passport.authenticate('jwt',{session: false}), mainController.board_summary_get);
router.get('/addMove', passport.authenticate('jwt',{session: false}), mainController.add_move_get);
router.post('/addMove', passport.authenticate('jwt',{session: false}), mainController.add_move_post);
router.get('/endGame', passport.authenticate('jwt',{session: false}), mainController.end_game_get)

/*Authentication*/
router.post('/createNewUser', authController.create_user_post);
router.get('/createNewUser', authController.create_user_get);
router.post('/login', authController.log_in_post);

module.exports = router;
