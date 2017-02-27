chatApp.config(function($routeProvider) {
  $routeProvider
  .when('/', {
    templateUrl: 'pages/form.html',
    controller: 'main'
  })
  .when('/usersPage', {
    templateUrl: 'pages/usersPage.html',
    controller: 'usersPage'
  })
})
