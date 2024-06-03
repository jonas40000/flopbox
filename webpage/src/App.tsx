import React from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import Home from "./components/Home";
import User from "./components/User";
import { useUser } from "./contexts/UserContext";

const App: React.FC = () => {
  const { user } = useUser();

  return (
    <Switch>
      <Route exact path="/">
        {user ? <Redirect to="/user" /> : <Home />}
      </Route>
      <Route path="/user">{user ? <User /> : <Redirect to="/" />}</Route>
    </Switch>
  );
};

export default App;
