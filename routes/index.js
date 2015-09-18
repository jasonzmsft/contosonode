// ----------------------------------------------------------------------------
// Contoso Node
// ----------------------------------------------------------------------------

var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    var now = new dAte();
	res.render('index', {
    	title: 'Hello and welcome!',
		now: now
	});
});

module.exports = router;
