import {
    advanceBlock
} from './helpers/advanceToBlock';
import {
    increaseTimeTo,
    duration
} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMThrow from './helpers/EVMThrow';

const BigNumber = web3.BigNumber;

const should = require('chai')
    .use(require('chai-as-promised'))
    .use(require('chai-bignumber')(BigNumber))
    .should();

const FinalizableCrowdsale = artifacts.require('../helpers/FinalizableCrowdsaleMock.sol');
const MintableToken = artifacts.require('MintableToken.sol');

contract('FinalizableCrowdsale', function([_, owner, wallet, thirdparty]) {
    const rate = new BigNumber(1000);

    before(async function() {
        //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
        await advanceBlock();
    });

    beforeEach(async function() {
        this.startTime = latestTime() + duration.weeks(1);
        this.endTime = this.startTime + duration.weeks(1);
        this.afterEndTime = this.endTime + duration.seconds(1);

        this.token = await MintableToken.new();
        this.crowdsale = await FinalizableCrowdsale.new(this.startTime, this.endTime, rate, wallet, this.token.address, {
            from: owner
        });
    });

    it('cannot be finalized before ending', async function() {
        await this.crowdsale.finalize({
            from: owner
        }).should.be.rejectedWith(EVMThrow);
    });

    it('cannot be finalized by third party after ending', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({
            from: thirdparty
        }).should.be.rejectedWith(EVMThrow);
    });

    it('can be finalized by owner after ending', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({
            from: owner
        }).should.be.fulfilled;
    });

    it('cannot be finalized twice', async function() {
        await increaseTimeTo(this.afterEndTime);
        await this.crowdsale.finalize({
            from: owner
        });
        await this.crowdsale.finalize({
            from: owner
        }).should.be.rejectedWith(EVMThrow);
    });

    it('logs finalized', async function() {
        await increaseTimeTo(this.afterEndTime);
        const {
            logs
        } = await this.crowdsale.finalize({
            from: owner
        });
        const event = logs.find(e => e.event === 'Finalized');
        should.exist(event);
    });
});
