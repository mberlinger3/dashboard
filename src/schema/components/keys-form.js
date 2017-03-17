import React, { Component } from "react"
import { connect } from "react-redux"
import { query as q } from "faunadb"
import { TextField, Dropdown, MessageBar, MessageBarType } from "office-ui-fabric-react"

import SchemaForm from "./schema-form"
import { selectedDatabase } from "../"
import { notify } from "../../notifications"
import { faunaClient } from "../../authentication"
import { KeyType } from "../../persistence/faunadb-wrapper"

class KeysForm extends Component {

  constructor(props) {
    super(props)
    this.state = this.initialState()
  }

  initialState() {
    return {
      form: this.formState(),
      secret: null
    }
  }

  formState() {
    return {
      name: "",
      role: null,
      database: null
    }
  }

  componentDidMount() {
    this.setState(this.initialState())
  }

  clearForm() {
    this.setState({ ...this.state, form: this.formState() })
  }

  onChange(field) {
    return value => this.setState({
      form: { ...this.state.form, [field]: value }
    })
  }

  onSelect(field) {
    return item => this.setState({
      form: { ...this.state.form, [field]: item.key }
    })
  }

  onSubmit() {
    const { client, database } = this.props

    return notify("Key created successfully", () =>
      client
        .query(database.get("path"), KeyType.ADMIN, q.CreateKey(this.keyConfig()))
        .then(key => this.setState({ secret: key.secret }))
    )
  }

  keyConfig() {
    let res = {
      role: this.state.form.role,
      database: q.Database(this.state.form.database)
    }

    let name = this.state.form.name.trim()
    if (name) res.data = { name }

    return res
  }

  render() {
    const { database } = this.props

    return <div>
        <SchemaForm
          title="Create a new key"
          buttonText="Create Key"
          onSubmit={this.onSubmit.bind(this)}
          onFinish={this.clearForm.bind(this)}>

            <TextField label="Name"
              value={this.state.form.name}
              onBeforeChange={this.onChange("name")} />

            <Dropdown
              label="Role"
              selectedKey={this.state.form.role}
              onChanged={this.onSelect("role")}
              options={[
                { key: "admin", text: "admin" },
                { key: "server", text: "server" },
                { key: "server-readonly", text: "server-readonly" },
                { key: "client", text: "client" }
              ]} />

            <p className="ms-TextField-description">
              Check <a href="https://fauna.com/documentation/#authentication" target="_blank">https://fauna.com/documentation/#authentication</a> for
              more information about the key's role.
            </p>

            <Dropdown
              label="Database"
              selectedKey={this.state.form.database}
              onChanged={this.onSelect("database")}
              options={
                database.get("databases").map(db => ({
                  key: db.get("name"),
                  text: db.get("name")
                })).toJSON()
              } />
        </SchemaForm>

        {this.state.secret ?
          <div>
            <br />
            <MessageBar messageBarType={MessageBarType.severeWarning}>
              Your key's secret is: <pre>{this.state.secret}</pre>
              Be aware that this secret won't be displayed again.
            </MessageBar>
          </div> : null
        }
      </div>
  }
}

export default connect(
  (state, props) => ({
    client: faunaClient(state),
    database: selectedDatabase(state),
    ...props
  })
)(KeysForm)
