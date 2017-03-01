
var chatApp = angular.module('chatApp', ['ngRoute']);

chatApp.service('deepstream', function() {
  return deepstream( 'wss://154.dsh.cloud?apiKey=678bd5dd-1700-4f8a-8e35-cd1552d4576c');
})

chatApp.service('deepstreamService', function($q, $http, deepstream) {
  var deepstreamService =  {}
  var userId;
  var userEmail;

  function signUp(email, password) {
    $http.post(
      'https://api.dsh.cloud/api/v1/user-auth/678bd5dd-1700-4f8a-8e35-cd1552d4576c',
      {
        email : email,
        password: password
      },
      { withCredentials: true }
    )
    .then(function(response) {
      console.log('registered successfuly')
      console.log(response)
      deepstreamService.login(email, password)
    },
    function(response) {
      console.log('registered not successfully')
      console.log(response)
    });
  }

  deepstreamService.login = function(email, password) {
    return $q(function(resolve, reject) {
      deepstream.login({ type: 'email', email: email, password: password }, (success, clientData) => {
        if (!success) {
          signUp(email, password)
        } else {
          userId = clientData.id
          userEmail = email
          var list = deepstream.record.getList('users');
          list.whenReady(()=>{
            if(list.getEntries().indexOf(userId)===-1) {
              list.addEntry(userId);
              var rec = deepstream.record.getRecord(userId);
              rec.set('email', email)
              rec.discard();
            }
            resolve();
          })
        }
      })
    })
}

    deepstreamService.getDeepstream = function() {
      return deepstream
    }

    deepstreamService.getUser = function() {
      return {
        id: userId,
        email: userEmail
      }
    }
    return deepstreamService
  })

chatApp.controller('main', function($scope, deepstreamService) {

  $scope.user = {
    email: '',
    password: ''
  }
  $scope.loggedIn = false

  $scope.login = function() {
    deepstreamService.login($scope.user.email, $scope.user.password)
    .then(function() {
      $scope.loggedIn = true
    })
  }
})

chatApp.controller('chats', function($scope, $http, deepstreamService, deepstream) {
  $scope.private = false;
  $scope.newMessage = '';
  $scope.usersList = [];
  $scope.chatFriendEmail = '';
  $scope.myDetails = deepstreamService.getUser()
  function addChatMessage(recordName) {
    var rec = deepstream.record.getRecord(recordName);
    rec.whenReady(()=>{
      $scope.messages.push(rec);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    })
  }

  $scope.onlineUsers = [];
  deepstream.presence.getAll((onlineUsers) => {
    console.log('online users', onlineUsers)
    $scope.onlineUsers = onlineUsers
  })
  deepstream.presence.subscribe((username, online) => {
    if (online) {
      $scope.onlineUsers.push(username);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    }
    else {
      console.log(username)
      $scope.onlineUsers.splice($scope.onlineUsers.indexOf(username), 1);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    }
  })


  var userId = $scope.myDetails.id;
  var deepstream = deepstreamService.getDeepstream();

  var list = deepstream.record.getList('users');
  list.whenReady(()=>{
    function addUser(userId) {
      deepstream.record.snapshot(userId, (err, data) => {
        $scope.usersList.push({
          userId: userId,
          email: data.email
        })
        console.log($scope.usersList)
        if (!$scope.$$phase) {
          $scope.$apply()
        }
      });
    }
    list.on('entry-added', addUser);
    list.getEntries().forEach(addUser);
  })

  $scope.isActive = false;

  $scope.selectChat = function(friendId, friendEmail) {
    $scope.highlighted = friendId;
    console.log($scope.highlighted)
    $scope.isActive = !$scope.isActive;

    $scope.newMessage = '';
    $scope.private = true;
    $scope.messages = [];
    $scope.chatFriendEmail = friendEmail;

    var chatName = [userId,friendId].sort().join('::');

    var chatList = deepstream.record.getList(chatName);

    chatList.whenReady(function() {
      chatList.on('entry-added', addChatMessage);
      chatList.getEntries().forEach(addChatMessage);
    })

    $scope.submit = function() {
      var record = deepstream.record.getRecord(deepstream.getUid())
      record.whenReady(()=> {
        record.set({
          message: $scope.newMessage,
          from: $scope.user.email,
          to: friendEmail,
          time: Date.now()
        })
        if (!$scope.$$phase) {
          $scope.$apply()
        }
        chatList.addEntry(record.name);
        $scope.newMessage = '';
      })
    }

  }
});
