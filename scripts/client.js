


var chatApp = angular.module('chatApp', ['ngRoute']);

chatApp.service( 'deepstream', function() {

  return deepstream( 'wss://154.deepstreamhub.com?apiKey=639064d0-1d59-4075-bf11-d25535c91f45')

})
chatApp.service( 'bindFields', function(){
  return function getField( $scope, record, names ) {
    angular.forEach( names, function( name ){
      Object.defineProperty( $scope, name, {
        get: function() {
          return record.get( name );
        },
        set: function( newValue ) {
          if( newValue === undefined ) {
            return;
          }
          record.set( name, newValue );
        }
      });
    });

    record.subscribe(function() {
      if( !$scope.$$phase ) {
        $scope.$apply();
      }
    });
  };
})



chatApp.controller('main',
function($scope, deepstream, bindFields, $http) {

  $scope.logedIn = false;
  $scope.private = false;
  var usersList = [];
  $scope.login = function() {
    console.log($scope.email, $scope.password)

    deepstream.login({
      type: 'email',
      email: $scope.email,
      password: $scope.password
    }, (success, data)=> {
      if(!success) {

        $http.post(
          'https://api.dsh.cloud/api/v1/user-auth/678bd5dd-1700-4f8a-8e35-cd1552d4576c',
          {email : $scope.email,
            password: $scope.email},
            { withCredentials: true }
          )

          .then(function(response) {
            console.log('registered successfuly')
            console.log(response)
          },
          function(response) {
            console.log('registered not successfully')
            console.log(response)
          });
        }
        else {

          var userId = 'user/' + data.id;
          $scope.userId = userId;
          var list = deepstream.record.getList('users');
          list.whenReady(()=>{
            if(list.getEntries().indexOf(userId)===-1) {
              list.addEntry(userId);
              var rec = deepstream.record.getRecord(userId);
              rec.set('email', $scope.email)
              rec.discard();
            }

            function addUser(userId) {
              deepstream.record.snapshot(userId, (err, data) => {
                usersList.push({
                  userId:userId,
                  email:data.email
                })
                $scope.usersList = usersList;
                $scope.logedIn = true;

                if (!$scope.$$phase) {
                  $scope.$apply()
                }
              });
            }
            list.on('entry-added', addUser);
            list.getEntries().forEach(addUser);
          })
        }
      })
    }

    $scope.setPrivate = function(event) {
      $scope.private = true;
      $scope.messages = [];
      var messages = [];
      $scope.chatFriend = {
        id:event.target.id,
        email:event.target.innerHTML
      }
        var chatName = [$scope.userId, $scope.chatFriend.id].sort().join('::');
        var chatList = deepstream.record.getList(chatName);
        $scope.chatList = chatList;
        chatList.subscribe((data)=> {
          $scope.chatList = data;
        })
        chatList.whenReady(()=>{
          chatList.getEntries().forEach(function(recordName) {
            var obj = {};
            var rec = deepstream.record.getRecord(recordName);
            rec.whenReady(()=>{
              obj = {
                id: rec.name,
                message: rec.get('message'),
                from: rec.get('from'),
                to: rec.get('to')
              }
              messages.push(obj);
              $scope.messages = messages;
              if (!$scope.$$phase) {
                $scope.$apply()
              }
            })
          })
        })
        $scope.submit = function() {
          var messageId = deepstream.getUid();
          deepstream.record.getRecord(messageId).set({
            message: $scope.newMessage,
            from: $scope.email,
            to: $scope.chatFriend.email
          })
          $scope.messages.push({
            message: $scope.newMessage,
            from: $scope.email,
            to: $scope.chatFriend.email
          })
          chatList.addEntry(messageId);
          $scope.newMessage = '';
        }
    }

  });
