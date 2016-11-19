import React, { Component } from 'react';
import {Treebeard} from 'react-treebeard';
import { Link } from 'react-router';
import faunadb from 'faunadb';
const q = faunadb.query, Ref = q.Ref;

export class IndexInfo extends Component {
  constructor(props) {
    super(props);
    this.state = {info:{
      source:{}
    }};
  }
  componentDidMount() {
    this.getIndexInfo(this.props.client, this.props.params.name)
  }
  getIndexInfo(client, name) {
    client && client.query(q.Get(Ref("indexes/"+name))).then( (res) => {
      this.setState({info : res})
    })
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.params.name !== nextProps.params.name ||
      this.props.client !== nextProps.client) {
      this.getIndexInfo(nextProps.client, nextProps.params.name)
    }
  }
  render() {
    return (<div>
        <h3>Index Details</h3>
        <IndexCard client={this.props.client} info={this.state.info}/>
        <IndexQuery client={this.props.client} info={this.state.info}/>
      </div>)
  }
}

class IndexQuery extends Component {
  constructor(props) {
    super(props);
    this.gotTerm = this.gotTerm.bind(this);
    this.state = {};
  }
  gotTerm(term) {
    console.log("Got Term", term)
    this.setState({term})
  }
  render() {
    var termInfo, queryResults;
    if (this.props.info.terms) {
      // get a term
      termInfo = <TermForm onSubmit={this.gotTerm}/>;
        if (this.state.term) {
          queryResults = <QueryResult client={this.props.client} info={this.props.info} term={this.state.term}/>
        } else {
          // no query
        }
    } else {
      // run a termless query
      termInfo = <p>Class index for {this.props.info.source.value}</p>;
      queryResults = <QueryResult client={this.props.client} info={this.props.info} />
    }
    return (<div>
      {termInfo}
      {queryResults}
    </div>);
  }
}
class QueryResult extends Component {
  constructor(props) {
    super(props);
    this.state = {result:{data:[]}};
    this.clickedRef = this.clickedRef.bind(this);

  }
  componentDidMount() {
    this.getIndexRows(this.props.info.name, this.props.term);
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.info.name !== nextProps.info.name ||
      this.props.term !== nextProps.term) {
      this.getIndexRows(nextProps.info.name, nextProps.term)
    }
  }
  getIndexRows(name, term) {
    console.log("get rows for", name, term)
    if (!name) return;
    var query;
    if (term) {
      query = q.Paginate(q.Match(Ref("indexes/"+name), term))
    } else {
      query = q.Paginate(q.Match(Ref("indexes/"+name)))
    }
    this.props.client && this.props.client.query(query).then((res) => {
      this.setState({result : res})
    })
  }
  clickedRef(item) {
    console.log("clickedRef",item, this)
    this.setState({instanceRef:item});
  }
  render() {
    return (<div>
        <h3>Query Results</h3>
        <ul>
          {this.state.result.data.map((item)=>{
            console.log(item)
            return <li key={item.value} onClick={this.clickedRef.bind(null, item)}>{JSON.stringify(item, null, 2)}</li>
          })}
        </ul>
        <InstancePreview client={this.props.client} instanceRef={this.state.instanceRef}/>
      </div>)
  }
}

class InstancePreview extends Component {
  constructor(props) {
    super(props);
    this.state = {instance:false};
  }
  componentDidMount() {
    this.getInstanceData(this.props.instanceRef);
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.instanceRef !== nextProps.instanceRef) {
      this.getInstanceData(nextProps.instanceRef)
    }
  }
  getInstanceData(instanceRef) {
    console.log("getInstanceData", instanceRef)
    this.props.client && this.props.client.query(q.Get(Ref(instanceRef))).then((res) => {
      this.setState({instance : res})
    })
  }
  render() {
    const instance = this.state.instance;
    if (!instance){
      return <div/>;
    }
    return (<div>
        <h3>Instance Preview</h3>
        <dl>
          <dt>Class</dt><dd>{instance.class.toString()}</dd>
          <dt>Ref</dt><dd>{instance.ref.toString()}</dd>
          <dt>TS</dt><dd>{instance.ts}</dd>
          <dt>Data</dt>
          <dd><pre>{require('util').inspect(instance.data, { depth: null })}</pre></dd>
        </dl>
      </div>)
  }
}

class TermForm extends Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = {value:""};
  }
  handleChange(event) {
    this.setState({value: event.target.value});
  }
  handleSubmit(event) {
    event.preventDefault();
    var parsed, value = this.state.value;
    try {
      parsed = JSON.parse(value);
      if (parsed["@ref"]) {
        value = q.Ref(parsed["@ref"])
      }
    } catch(e) {} // not JSON
    this.props.onSubmit(value);
  }
  render() {
    return (
      <form onSubmit={this.handleSubmit}>
        Index term: <input type="text" value={this.state.value} onChange={this.handleChange}/>
      </form>
    )
  }
}

class IndexCard extends Component {
  render() {
    var info = this.props.info;
    var active = info.active;
    var unique = info.unique;
    console.log("info",info)
    var termsMarkup = info.terms && <div>
      <dt>Terms</dt>
      <dd>
        <dl>
          {info.terms.map((t, i)=>{
            return (<div key={i}>
              <dt>Field</dt>
              <dd>{JSON.stringify(t.field)}</dd>
            </div>)
          })}
        </dl>
      </dd>
    </div>;
    var valuesMarkup = info.values && <div>
      <dt>Values</dt>
      <dd>
        <dl>
          {info.values.map((t, i)=>{
            return (<div key={i}>
              <dt>Field</dt>
              <dd>{JSON.stringify(t.field)}</dd>
            </div>)
          })}
        </dl>
      </dd>
    </div>;

    return (
      <div className="IndexInfo">
        <dl>
          <dt>Name</dt><dd>{info.name}</dd>
          <dt>Active</dt><dd>{active ? "true" : "false"}</dd>
          <dt>Unique</dt><dd>{unique ? "true" : "false"}</dd>
          <dt>Partitions</dt><dd>{info.partitions}</dd>
          <dt>Source</dt><dd><Link to={info.source.value}>{info.source.value}</Link></dd>
          {termsMarkup}
          {valuesMarkup}
        </dl>
      </div>
    );
  }
}
