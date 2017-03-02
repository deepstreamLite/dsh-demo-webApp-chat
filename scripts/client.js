
var chatApp = angular.module('chatApp', ['ngRoute']);


chatApp.service('deepstreamService', function($q, $http) {
  var deepstreamService =  {}
  var userId;
  var userEmail;
  var ds = deepstream( 'wss://154.dsh.cloud?apiKey=ceb0c746-d4d5-4e1d-910e-8db2916819ea');
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
      ds.login({ type: 'email', email: email, password: password }, (success, clientData) => {
        if (!success) {
          signUp(email, password)
        }
        else {
          userId = 'users/' + clientData.id
          userEmail = email
          var list = ds.record.getList('users');
          list.whenReady(()=>{
            if(list.getEntries().indexOf(userId)===-1) {
              var rec = ds.record.getRecord(userId);
              rec.whenReady(()=> {
                rec.set('email', email)
                list.addEntry(userId);
                rec.discard();
              })
            }
            resolve();
          })
        }
      })
    })
}

    deepstreamService.getDeepstream = function() {
      return ds
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
    email: 'jim@test.com',
    password: 'password'
  }
  $scope.loggedIn = false

  $scope.login = function() {
    deepstreamService.login($scope.user.email, $scope.user.password)
    .then(function() {
      $scope.loggedIn = true
    })
  }
})

chatApp.controller('chats', function($scope, $http, deepstreamService) {
  var ds = deepstreamService.getDeepstream();

  $scope.private = false;
  $scope.newMessage = '';
  $scope.usersList = [];
  $scope.chatFriendEmail = '';
  $scope.onlineUsers = [];
  $scope.myDetails = deepstreamService.getUser();

  function addChatMessage(recordName) {
    var rec = ds.record.getRecord(recordName);
    rec.whenReady(()=>{
      $scope.messages.push(rec);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    })
  }

  ds.presence.getAll((onlineUsers) => {
    var online = [];
    onlineUsers.forEach(function(item) {
      online.push('users/' + item);
    })
    $scope.onlineUsers = online;
  })

  ds.presence.subscribe((username, online) => {
    if (online) {
      $scope.onlineUsers.push('users/' + username);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    }
    else {
      $scope.onlineUsers.splice($scope.onlineUsers.indexOf('users/' + username), 1);
      if (!$scope.$$phase) {
        $scope.$apply()
      }
    }
  })

  var userId = $scope.myDetails.id;
  var list = ds.record.getList('users');
  list.whenReady(()=>{
    function addUser(userId) {
      ds.record.snapshot(userId, (err, data) => {
        $scope.usersList.push({
          userId: userId,
          email: data.email
        })
        if (!$scope.$$phase) {
          $scope.$apply()
        }
      });
    }
    list.on('entry-added', addUser);
    list.getEntries().forEach(addUser);
  })

    $scope.selectChat = function(friendId, friendEmail) {
    $scope.highlighted = friendId;
    $scope.newMessage = '';
    $scope.private = true;
    $scope.messages = [];
    $scope.chatFriendEmail = friendEmail;

    var chatName = [userId.substring(6),friendId.substring(6)].sort().join('::');
console.log(chatName)
    var chatList = ds.record.getList(chatName);

    chatList.whenReady(function() {
      chatList.on('entry-added', addChatMessage);
      chatList.getEntries().forEach(addChatMessage);
    })

    $scope.submit = function() {
      var record = ds.record.getRecord(ds.getUid())
      record.whenReady(()=> {
        record.set({
          content: $scope.newMessage,
          email: $scope.user.email,
          id:userId,
          msgId: ds.getUid(),
          time: Date.now()
        })
        $scope.newMessage = '';

        if (!$scope.$$phase) {
          $scope.$apply()
        }
        chatList.addEntry(record.name);
      })
    }
  }
});
