(function($) {

  /**
   * jQuery plugin initialization
   * @param object User provided options.
   * @return jQuery object for chaining.
   */
  $.fn.minesweeper = function(options) {

    /**
     * Helper function - returns a random int between two int values.
     * @param int min lower bound
     * @param int max higher bound
     * @return int random value
     */
    function mt_rand(min,max) {
      return Math.floor(Math.random()*(max-min+1)+min);
    }

    /**
     * Randomize an array.
     * @param array The input array.
     * @return array Randomized array.
     */
    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex ;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }

    /**
     * Represents a minesweeper instance. Plugin main 'class'.
     * @param jQuery object $container : the dom element the plugin was called upon.
     * @param object options User provided options.
     */
    var Minesweeper = function($container, options) {
      var ms = this;

      this.settings = $.extend({
        // These are the defaults.
        difficulty: 'medium'
      }, options );


      /**
       * Set width & height for every tile.
       * @return null
       */
      this.draw = function() {
        var containerWidth = ms.$container.width();
        var containerHeight = ms.$container.height() - ms.$container.find('.header').outerHeight() - 10;

        var containerMin = Math.min(containerWidth, containerHeight);
        var tileSize = 0;
        if(containerMin === containerWidth) {
          tileSize = containerWidth / ms.nbTilesX;
        }
        else {
          tileSize = containerHeight / ms.nbTilesY;
        }

        for(var i = 0; i < ms.nbTilesY; i++) {
          for(var j = 0; j < ms.nbTilesX; j++) {
            var tile = ms.tiles[i][j];
            var $tile = tile.$tile;

            $tile.css({
               width:tileSize - 1,
               height:tileSize - 1
            });
          }
        }
        ms.$container.find('.header').width(ms.$container.find('.tiles').width());
      };

      /**
       * Generate minesweeper header.
       * @return null
       */
      this.makeHeader = function() {
        $.ajax({
          url: 'dist/templates/header.html',
          type: 'GET',
          dataType: 'html'
        })
        .done(function(data) {
          var $header = $(data);
          $header.find('.nbMines').text( ms.nbMines );
          $header.find('button').on('click', ms.showMenu);
          $container.prepend($header);
        })
        .fail(function() {
          console.log('error');
        });
      };

      /**
       * Generate minesweeper menu
       * @return null
       */
      this.makeMenu = function() {
        $.ajax({
          url: 'dist/templates/menu.html',
          type: 'GET',
          dataType: 'html'
        })
        .done(function(data) {
          var $menu = $(data);
          $menu.hide();
          $container.find('.tiles').append($menu);

          // bind difficulty to form
          $menu.find('input[name="difficulty"]').prop('checked', false).on('change', function() {
            ms.settings.difficulty = $(this).val();
          });
          $menu.find('input[name="difficulty"][value="' + ms.settings.difficulty + '"]').prop('checked', 'checked');

          // on restart...
          $menu.find('button#restart').on('click', function(){
            ms.destroy();
            ms.init();
            ms.draw();
          });

        });
      };

      /**
       * Completely remove this instance and restore dom state as it was before calling the plugin.
       * @return null
       */
      this.destroy = function() {
        ms.$container.empty();
      };


      /**
       * Toggle visible / hidden state of the menu.
       * @return null
       */
      this.showMenu = function() {
        var $menu = ms.$container.find('.menu');
        if($menu.is(':visible')) {
          $menu.fadeOut();
          // restart clock
          ms.startClock();
        }
        else {
          $menu.fadeIn();
          // stop clock
          ms.pauseClock();
        }
      };

      /**
       * Instance initialization. Initialize instance variables, check settings, creates tiles and bind events.
       * @return null
       */
      this.init = function() {

        this.tiles = [];
        this.$container = $container;
        clearTimeout(this.clock);
        this.clock = null;
        this.seconds = 0;
        this.presets = {
          'easy': {
            nbTilesX: 5,
            nbTilesY: 5,
            nbMines: 7
          },
          'medium': {
            nbTilesX: 10,
            nbTilesY: 10,
            nbMines: 15
          },
          'hard': {
            nbTilesX: 20,
            nbTilesY: 20,
            nbMines: 30
          }
        };

        if(typeof this.presets[this.settings.difficulty] === 'undefined') {
          this.settings.difficulty = 'medium';
        }

        // TODO: Make a function for this ugly conditions
        if(
          Number.isInteger( this.settings.nbTilesX ) && this.settings.nbTilesX > 4 && this.settings.nbTilesX < 21
          && Number.isInteger( this.settings.nbTilesY ) && this.settings.nbTilesY > 4 && this.settings.nbTilesY < 21
          && Number.isInteger( this.settings.nbMines ) && this.settings.nbMines > 0 && this.settings.nbMines < (this.settings.nbTilesX * this.settings.nbTilesY)
          )
        {
          this.nbTilesX = this.settings.nbTilesX;
          this.nbTilesY = this.settings.nbTilesY;
          this.nbMines = this.settings.nbMines;
        }
        else {
          this.nbTilesX = this.presets[this.settings.difficulty].nbTilesX;
          this.nbTilesY = this.presets[this.settings.difficulty].nbTilesY;
          this.nbMines = this.presets[this.settings.difficulty].nbMines;
        }

        $container.append('<div class="tiles"></div>');

        for(var i = 0; i < this.nbTilesY; i++) {
          // create row
          var $row = $('<div class="row"></div>');
          var row = [];

          for(var j = 0; j < this.nbTilesX; j++) {
            var $tile = $('<div class="tile"></div>');
            $tile.on('click', this.click);
            $tile.on('dblclick', this.dblclick);
            $tile.on('contextmenu', this.flag);
            $tile.attr('unselectable', 'on').css('user-select', 'none').on('selectstart', false);

            $tile.html('&nbsp;');
            $row.append($tile);

            var tile = new Tile({
              $tile: $tile,
              i: i,
              j: j
            });

            $tile.data('tile', tile);
              row.push(tile);
          }

          this.$container.find('.tiles').append($row);
          this.tiles.push(row);
        }

        // make header
        ms.makeHeader();
        ms.makeMenu();
      };

      /**
       * Set a flag on a tile. Decrements total mines number. Prevents accidental clicks.
       * @return null
       */
      this.flag = function() {
        var $tile = $(this);
        if( ! $tile.hasClass('revealed')) {
          //var tile = $tile.data('tile');
          $tile.toggleClass('flagged');
          var nbMinesLeft = ms.nbMines - ms.$container.find('.flagged').length;
          ms.$container.find('.nbMines').text( nbMinesLeft );
        }

        return false;
      };

      /**
       * Automatically reveals all tiles around one. Recurses if tiles around have zero mines around.
       * @param initialTile Tile the original tile that was clicked.
       * @return null
       */
      this.revealAll = function(initialTile) {
        var tileToProcess = initialTile;
        var tilesToProcess = [];
        var tilesProcessed = 0;

        do {
          ms.revealingAll = true;
          var tilesAround = ms.getTilesAround(tileToProcess);

          for(var i = 0; i < tilesAround.length; i++) {
            var isInArray = false;

            for(var j = 0; j < tilesToProcess.length; j++) {
              if(tilesToProcess[j] === tilesAround[i]) {
                isInArray = true;
              }
            }

            if( ! isInArray && tilesAround[i].minesAround === 0 && ! tilesAround[i].$tile.hasClass('revealed')) {
              tilesToProcess.push(tilesAround[i]);
            }

            if(tilesAround[i].minesAround > 0) {
              ms.revealTile(tilesAround[i]);
            }
          }

          // process current tile
          ms.revealTile(tileToProcess);

          // tile is processed : remove it from array
          var tileIndex = tilesToProcess.indexOf(tileToProcess);
          if(tileIndex > -1) {
            tilesToProcess.splice(tileIndex, 1);
          }

          tileToProcess = tilesToProcess[0];
          tilesProcessed++;
        }

        while(tilesToProcess.length > 0);
        ms.revealingAll = false;
      };

      /**
       * Actions when a tile is clicked.
       * @param tile Tile
       * @return null
       */
      this.revealTile = function(tile) {

        var $tile = tile.$tile;

        if( ! $tile.hasClass('flagged')) {

          if( ! ms.clock) {
            ms.startClock();
            ms.placeMines(tile);
          }

          if(tile.mined) {
            console.log('you have been eated by a Trex');
            ms.pauseClock();

            // make all mined tiles burn hahah
            for(var i = 0; i < ms.tiles.length; i++) {
              for(var j = 0; j < ms.tiles[i].length; j++) {
                var thisTile = ms.tiles[i][j];

                if(thisTile.mined) {
                  thisTile.$tile.addClass('exploding');
                }
              }
            }

            setTimeout(function(){
              ms.$container.find('.exploding').removeClass('exploding').addClass('exploded');
            }, 1200);
          }
          else if(tile.minesAround === 0 && ! ms.revealingAll) {
            ms.revealAll(tile);
          }
          else {
            if(tile.minesAround > 0) {
              tile.$tile.html(tile.minesAround);
            }

            tile.$tile.addClass('revealed');
          }

          if(ms.checkVictory()) {
            console.log('victory');
            ms.stopClock();
          }
        }
      };


      /**
       * When a tile is double-clicked, if nb of mines around == nb of flagged tiles around, reveals automatically all tiles around.
       * @return null
       */
      this.dblclick = function() {
        var $tile = $(this);
        if($tile.hasClass('revealed')) {
          var tile = $tile.data('tile');
          var nbFlagged = 0;
          var tilesAround = ms.getTilesAround(tile);

          for(var i = 0; i < tilesAround.length; i++) {
            if(tilesAround[i].$tile.hasClass('flagged')) {
              nbFlagged++;
            }
          }

          if(tile.minesAround === nbFlagged) {
            for(var i = 0; i < tilesAround.length; i++) {
              ms.revealTile(tilesAround[i]);
            }
          }
        }
      };

      /**
       * When a tile is clicked, reveals it.
       * @return null
       */
      this.click = function() {
        var $tile = $(this);
        var tile = $tile.data('tile');
        ms.revealTile(tile);
      };

      /**
       * Display a success video on victory, then display message + restart btn.
       * @return null
       */
      this.checkVictory = function() {
        var nbRevealed = 0;
        for(var i = 0; i < ms.tiles.length; i++) {
          for(var j = 0; j < ms.tiles[i].length; j++) {
            var $tile = ms.tiles[i][j].$tile;

            if($tile.hasClass('revealed')) {
              nbRevealed++;
            }
          }
        }

        if(nbRevealed === (ms.nbTilesX * ms.nbTilesY) - ms.nbMines) {
          console.log('victory');
        }
      };

      /**
       * Randomly set mines inside tiles.
       * @param safeTile Tile This tile and its neighbours should not be mined, to prevent game over on game start.
       * @return null
       */
      this.placeMines = function(safeTile) {
        // build available tiles array
        var availableTiles = [];
        for(var i = 0; i < this.tiles.length; i++) {
          for(var j = 0; j < this.tiles[i].length; j++) {
            if(safeTile !== this.tiles[i][j]) {
            availableTiles.push(this.tiles[i][j]);
          }
          }
        }

        // shuffle array
        availableTiles = shuffle(availableTiles);

        // pick [nbmines] mines from this array
        for(var k = 0; k < ms.nbMines; k++) {
          var randomTile = availableTiles[k];
          randomTile.mined = true;

          // on incrémente les indices autour de cette mine
          var tilesAround = this.getTilesAround(randomTile);
          for(var i = 0; i < tilesAround.length; i++) {
            var tile = tilesAround[i];
            if(tile.mined) {
              continue;
            }
            tile.minesAround++;
          }
        }
      };

      /**
       * Returns all tiles around one tile.
       * @param tile Tile The target tile.
       * @return array An array containing references to tiles around.
       */
      this.getTilesAround = function(tile) {
          var tilesAround = [];
          var $tile = tile.$tile;
          var i = tile.i;
          var j = tile.j;

          // celle en haut à gauche
          if(ms.tileExists(i - 1, j - 1)) {
            tilesAround.push( ms.tiles[i - 1][j - 1] );
          }
          // celle en haut au centre
          if(ms.tileExists(i - 1, j)) {
            tilesAround.push( ms.tiles[i - 1][j] );
          }
          // celle en haut à droite
          if(ms.tileExists(i - 1, j + 1)) {
            tilesAround.push( ms.tiles[i - 1][j + 1] );
          }

          // celle à gauche
          if(ms.tileExists(i, j - 1)) {
            tilesAround.push( ms.tiles[i][j - 1] );
          }
          // celle de droite
          if(ms.tileExists(i, j + 1)) {
            tilesAround.push( ms.tiles[i][j + 1] );
          }

          // celle en bas à gauche
          if(ms.tileExists(i + 1, j - 1)) {
            tilesAround.push( ms.tiles[i + 1][j - 1] );
          }
          // celle en bas
          if(ms.tileExists(i + 1, j)) {
            tilesAround.push( ms.tiles[i + 1][j] );
          }
          // celle en bas à droite
          if(ms.tileExists(i + 1, j + 1)) {
            tilesAround.push( ms.tiles[i + 1][j + 1] );
          }

          return tilesAround;
      };

      /**
       * Checks if a tile is in the game's tiles array.
       * @param i int Row index in game's tiles array.
       * @param j int Tile index in current row.
       * @return bool True if the tile exists, false otherwise.
       */
      this.tileExists = function(i,j) {
        if(typeof ms.tiles[i] === 'undefined' || typeof ms.tiles[i][j] === 'undefined') {
          return false;
        }
        return true;
      };


      /**
       * Update elapsed time on screen every seconds.
       * @return null
       */
      this.startClock = function() {
        ms.clock = setInterval(function(){
          ms.seconds++;
          var minutes = Math.floor(ms.seconds / 60);
          var seconds = ms.seconds - (minutes * 60);
          if(minutes < 10) {
            minutes = '0' + minutes;
          }
          if(seconds < 10) {
            seconds = '0' + seconds;
          }
          ms.$container.find('.time').text(minutes + ':' + seconds);
        }, 1000);
      };

      /**
       * Stop updating time on screen every seconds.
       * @return null
       */
      this.pauseClock = function() {
        clearInterval(ms.clock);
      };

      /**
       * Stop clock and reset seconds count.
       * @return null
       */
      this.resetClock = function() {
        ms.pauseClock();
        ms.seconds = 0;
        ms.$container.find('.time').text('00:00');
      };

      // all methods are declared and ready to be used : init the game.
      this.init();
      this.draw();

      $(window).on('resize', ms.draw);
    };

    /**
     * Represents one square on the game's board.
     * @param settings object Initial state.
     */
    var Tile = function(settings){
      this.mined = false;
      this.minesAround = 0;
      this.$tile = settings.$tile;
      this.i = settings.i;
      this.j = settings.j;
    };

    this.each(function() {
      var $container = $(this);
      new Minesweeper($container, options);
    });

      return this;
  };

}( jQuery ));