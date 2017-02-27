


var chatApp = angular.module('chatApp', ['ngRoute']);

chatApp.service( 'deepstream', function() {

  return deepstream( 'wss://154.dsh.cloud?apiKey=678bd5dd-1700-4f8a-8e35-cd1552d4576c' )

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


chatApp.service('GetTheList', function() {
  var info;
  this.get = function() {
    return info;
  }

  this.set = function (value) {
    this.info = value;
  }
})

chatApp.controller('main',
function($scope, deepstream, bindFields, $http, $window, GetTheList) {
  // $scope.usersList = GetTheList.info;
  // $scope.set = function(value){
  //     getTheList.set(value);
  // };

  var usersList = [];
  $scope.login = function() {
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
          var list = deepstream.record.getList('users');
          // $scope.list = list;
          // $scope.list.subscribe(entries);

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
                GetTheList.set($scope.usersList);
                // console.log('login')
                console.log(GetTheList)


                // console.log(getTheList())


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

      setTimeout(function() {
      //   console.log('setTime')
        console.log($scope.usersList)
          $window.location.href = '#/usersPage';

      }, 500)

    }

  });

    chatApp.controller('usersPage',
    function($scope, deepstream, bindFields, $window, GetTheList) {
  $scope.users = GetTheList.info;
  console.log($scope.users)


    })
