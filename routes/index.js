var express = require('express');
var router = express.Router();
let mainController = require('../controllers/mainController')

router.get('/', async (req,res,next) => {
    res.render('index');
})

/*Set up Game*/
router.post('/addPlayer', mainController.add_player_post);
router.post('/removePlayer', mainController.remove_player_post);
router.get('/startGame', mainController.start_game_get);

/* In Game*/
router.get('/board', mainController.board_get);
router.get('/boardSummary', mainController.board_summary_get);
router.get('/addMove', mainController.add_move_get);
router.post('/addMove', mainController.add_move_post);
router.get('/endGame', mainController.end_game_get)

module.exports = router;
